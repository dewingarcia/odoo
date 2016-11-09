odoo.define('web.KanbanView', function (require) {
"use strict";

var core = require('web.core');
var data = require('web.data');
var data_manager = require('web.data_manager');
var form_common = require('web.form_common');
var KanbanRenderer = require('web.KanbanRenderer');
var AbstractView = require('web.AbstractView');

var _lt = core._lt;
var _t = core._t;
var qweb = core.qweb;

var KanbanView = AbstractView.extend({
    accesskey: "k",
    className: "o_kanban",
    custom_events: _.extend({}, AbstractView.prototype.custom_events, {
        quick_create_add_column: 'add_column',
        quick_create_record: 'quick_create_record',
        resequence_columns: 'resequence_columns',
        kanban_call_method: 'call_method',
        kanban_do_action: 'open_action',
        kanban_record_delete: function (event) {
            this.delete_records([event.data.record.db_id]);
        },
        kanban_record_update: 'update_record',
        kanban_column_delete: 'delete_column',
        kanban_column_add_record: 'add_record_to_column',
        kanban_column_resequence: function (event) {
            this.resequence_records(event.target.db_id, event.data.ids);
        },
        kanban_column_archive_records: 'archive_records',
        kanban_load_more: 'load_more',
        column_toggle_fold: 'toggle_column',
    }),
    defaults: _.extend(AbstractView.prototype.defaults, {
        quick_creatable: true,
        creatable: true,
        create_text: undefined,
        read_only_mode: false,
        confirm_on_delete: true,
    }),
    display_name: _lt("Kanban"),
    icon: 'fa-th-large',
    mobile_friendly: true,
    config: _.extend({}, AbstractView.prototype.config, {
        open_groups_by_default: true,
        Renderer: KanbanRenderer,
    }),

    init: function () {
        this._super.apply(this, arguments);

        this.arch = this.fields_view.arch;
        this.fields = this.fields_view.fields;

        // Retrieve many2manys stored in the fields_view if it has already been processed
        this.many2manys = this.fields_view.many2manys || [];
        this.m2m_context = {};
        this.process_many2manys();

        this.no_content_help = this.options.action.help;
        this.on_create = this.fields_view.arch.attrs.on_create;
        this.default_group_by = this.fields_view.arch.attrs.default_group_by;
        this.create_column_enabled = false; // true iff grouped by an m2o field and group_create action enabled

        this.column_options = {
            editable: this.is_action_enabled('group_edit'),
            deletable: this.is_action_enabled('group_delete'),
            group_creatable: this.is_action_enabled('group_create'),
            has_active_field: this.has_active_field(),
            quick_create: this._is_quick_create_enabled(),
        };
        this.record_options = {
            editable: this.is_action_enabled('edit'),
            deletable: this.is_action_enabled('delete'),
            model: this.model, // required by includes of KanbanRecord
            read_only_mode: this.options.read_only_mode,
        };
    },
    do_search: function (domain, context, group_by) {
        var self = this;
        var fields_def;
        if (group_by.length === 0 && this.default_group_by) {
            group_by = [this.default_group_by];
        }
        // FIXME: should be done by the model
        if (group_by.length > 0 && this.fields[group_by[0]] === undefined) {
            // load fields if the group_by field isn't in the field_view's fields
            fields_def = data_manager.load_fields(this.dataset).then(function (fields) {
                self.fields = fields;
            });
        }
        var _super = this._super.bind(this);
        return $.when(fields_def).then(function() {
            return _super(domain, context, group_by);
        });
    },
    has_content: function() {
        return this._super.apply(this, arguments) || this.create_column_enabled;
    },
    render_buttons: function ($node) {
        var self = this;
        if (this.options.action_buttons !== false && this.is_action_enabled('create')) {
            var widget = {
                options: _.pick(this.options, ['create_text', 'import_enabled']),
            };
            this.$buttons = $(qweb.render("KanbanView.buttons", {'widget': widget}));
            this.$buttons.on('click', 'button.o-kanban-button-new', function () {
                var data = self.datamodel.get(self.db_id);
                if (data.grouped_by.length > 0 && data.count > 0 && self.on_create === 'quick_create') {
                    // Activate the quick create in the first column
                    self.renderer.add_quick_create();
                } else if (self.on_create && self.on_create !== 'quick_create') {
                    // Execute the given action
                    self.do_action(self.on_create, {
                        on_close: self.reload.bind(self),
                        additional_context: data.context,
                    });
                } else {
                    // Open the form view
                    self.add_record();
                }
            });
            this.update_buttons();
            this.$buttons.appendTo($node);
        }
    },
    update_state: function(db_id) {
        var state = this.datamodel.get(db_id);
        var group_by_field = state.fields[state.grouped_by[0]];
        var grouped_by_m2o = group_by_field && (group_by_field.type === 'many2one');
        this.create_column_enabled = grouped_by_m2o && this.is_action_enabled('group_create');
        return this._super.apply(this, arguments);
    },
    update_buttons: function () {
        if (this.$buttons) {
            var data = this.datamodel.get(this.db_id);
            // In grouped mode, set 'Create' button as btn-default if there is no column (except
            // if we can't create new columns)
            var create_muted = data.count === 0 && this.create_column_enabled;
            this.$buttons.find('.o-kanban-button-new')
                .toggleClass('btn-primary', !create_muted)
                .toggleClass('btn-default', create_muted);
        }
    },
    process_many2manys: function () {
        function find_many2manys (node, fvg, many2manys) {
            if (node.tag === 'field') {
                var ftype = node.attrs.widget ? node.attrs.widget : fvg.fields[node.attrs.name].type;
                if (ftype === 'many2many' && !_.contains(many2manys, node.attrs.name)) {
                    many2manys.push(node.attrs.name);
                }
            }
            if (node.children) {
                for (var i = 0, ii = node.children.length; i < ii; i++) {
                    find_many2manys(node.children[i], fvg, many2manys);
                }
            }
        }
        for (var i=0, ii=this.fields_view.arch.children.length; i < ii; i++) {
            var child = this.fields_view.arch.children[i];
            if (child.tag === "templates") {
                // Find many2manys in templates
                find_many2manys(child, this.fields_view, this.many2manys);
                this.fields_view.many2manys = this.many2manys;
                break;
            } else if (child.tag === 'field') {
                // Get many2manys context
                var ftype = child.attrs.widget || this.fields_view.fields[child.attrs.name].type;
                if(ftype === "many2many" && "context" in child.attrs) {
                    this.m2m_context[child.attrs.name] = child.attrs.context;
                }
            }
        }
    },
    add_record: function() {
        this.dataset.index = null;
        this.do_switch_view('form');
    },
    add_record_to_column: function (event) {
        var self = this;
        var record = event.data.record;
        var column = event.target;
        this.alive(this.datamodel.move_record(record.db_id, column.db_id, this.db_id))
            .then(function (column_db_ids) {
                return self.resequence_records(column.db_id, event.data.ids).then(function () {
                    _.each(column_db_ids, function (db_id) {
                        var data = self.datamodel.get(db_id);
                        self.renderer.update_column(db_id, data, self.record_options);
                    });
                });
            }).fail(this.reload.bind(this));
    },
    quick_create_record: function (event) {
        var self = this;
        var column = event.target;
        var data = this.datamodel.get(column.db_id);
        function add_record (records) {
            return self.datamodel
                .add_record_in_group(data.id, records[0])
                .then(function (db_id) {
                    column.add_record(self.datamodel.get(db_id), {position: 'before'});
                });
        }
        var context = this.dataset.context; // for the record to appear in the column if there is a default filter
        context['default_' + data.grouped_by[0]] = column.id;
        this.datamodel
            .name_create(data.model, event.data.value, context)
            .then(add_record)
            .fail(function (event) {
                event.preventDefault();
                var popup = new form_common.SelectCreatePopup(this);
                popup.select_element(
                    data.model,
                    {
                        title: _t("Create: "),
                        initial_view: "form",
                        disable_multiple_selection: true,
                    },
                    [],
                    { default_name: event.data.value }
                );
                popup.on("elements_selected", null, add_record);
            });
    },
    update_record: function (event) {
        var record = event.target;
        return this.alive(this.datamodel.save(record.db_id, event.data)).then(record.update.bind(record));
    },
    archive_records: function (event) {
        if (!this.has_active_field()) {
            return;
        }
        var self = this;
        var active_value = !event.data.archive;
        var column = event.target;
        var record_ids = [];
        _.each(column.records, function (kanban_record) {
            if (kanban_record.record.active.value !== active_value) {
                record_ids.push(kanban_record.db_id);
            }
        });
        if (record_ids.length) {
            this.datamodel
                .toggle_active(record_ids, active_value, column.db_id)
                .then(function (db_id) {
                    var data = self.datamodel.get(db_id);
                    self.renderer.update_column(db_id, data, _.extend({}, this.record_options, {
                        relational_data: data.relational_data,
                    }));
                });
        }
    },
    add_column: function (event) {
        var self = this;
        this.datamodel.create_group(event.data.value, this.db_id).then(function () {
            self.update_state(self.db_id);
            self.trigger_up('scrollTo', {selector: '.o_column_quick_create'});
        });
    },
    delete_column: function (event) {
        var self = this;
        var column = event.target;
        var grouped_by = this.datamodel.get(this.db_id).grouped_by[0];
        this.datamodel
            .delete_records(this.db_id, [column.db_id], this.fields_view.fields[grouped_by].relation)
            .done(function() {
                if (column.is_empty()) {
                    self.renderer.remove_widget(column);
                    self.update_buttons();
                } else {
                    self.reload();
                }
            });
    },
    resequence_columns: function (event) {
        var grouped_by = this.datamodel.get(this.db_id).grouped_by[0];
        var model = this.fields_view.fields[grouped_by].relation;
        this.datamodel.resequence(model, event.data.ids, this.db_id);
    },
    resequence_records: function (column_id, ids) {
        return this.datamodel.resequence(this.model, ids, column_id);
    },
    _is_quick_create_enabled: function () {
        if (!this.options.quick_creatable || !this.is_action_enabled('create')) {
            return false;
        }
        if (this.fields_view.arch.attrs.quick_create !== undefined) {
            return JSON.parse(this.fields_view.arch.attrs.quick_create);
        }
        return true;
    },
    has_active_field: function () {
        return !!this.fields_view.fields.active;
    },
    load_more: function (event) {
        var self = this;
        var column = event.target;
        return this.datamodel.load_more(column.db_id).then(function (db_id) {
            var data = self.datamodel.get(db_id);
            self.renderer.update_column(db_id, data, _.extend({}, this.record_options, {
                relational_data: data.relational_data,
            }));
        });
    },
    toggle_column: function (event) {
        var self = this;
        var column = event.target;
        this.datamodel.toggle_group(column.db_id).then(function (db_id) {
            var data = self.datamodel.get(db_id);
            self.renderer.update_column(db_id, data, _.extend({}, this.record_options, {
                relational_data: data.relational_data,
            }));
        });
    },
    call_method: function (event) {
        var data = _.extend({ model: this.model }, event.data);
        this.trigger_up('perform_model_rpc', data);
    },
    open_action: function (event) {
        var self = this;
        var record = event.target;
        if (event.data.context) {
            event.data.context = new data.CompoundContext(event.data.context)
                .set_eval_context({
                    active_id: event.target.id,
                    active_ids: [event.target.id],
                    active_model: this.model,
                });
        }
        this.do_execute_action(event.data, this.dataset, event.target.id, function () { // fixme: use of this.dataset
            self.datamodel.reload(record.db_id).then(function (db_id) {
                var data = self.datamodel.get(db_id);
                record.update(data);
            });
        });
    },
    get_renderer_options: function() {
        return {
            record_options: this.record_options,
            column_options: this.column_options,
        };
    },
    update_renderer: function() {
        var state = this.datamodel.get(this.db_id);
        this.renderer.update(state, this.fields);
    },
});

return KanbanView;

});
