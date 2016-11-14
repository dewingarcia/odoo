odoo.define('web.FormView', function (require) {
"use strict";

var common = require('web.form_common');
var core = require('web.core');
var data = require('web.data');
var data_manager = require('web.data_manager');
var Dialog = require('web.Dialog');
var FormRenderer = require('web.FormRenderer');
var Sidebar = require('web.Sidebar');
var AbstractView = require('web.AbstractView');

var _t = core._t;
var _lt = core._lt;
var qweb = core.qweb;

var FormView = AbstractView.extend({
    // className: "o_form_view",
    display_name: _lt('Form'),
    icon: 'fa-edit',
    multi_record: false,
    searchable: false,
    config: _.extend({}, AbstractView.prototype.config, {
        page_size: 1,
        Renderer: FormRenderer,
    }),

    custom_events: _.extend({}, AbstractView.prototype.custom_events, {
        open_record: function(event) {
            var self = this;
            var record = this.datamodel.get(event.data.id);
            var model = record.model;
            var res_id = record.res_id;
            var fields_view_def;
            if (event.data.form_view) {
                fields_view_def = $.when(event.data.form_view);
            } else {
                var dataset = new data.DataSetSearch(this, model, event.data.context, event.data.domain);
                fields_view_def = data_manager.load_fields_view(dataset, false, 'form', false);
            }
            fields_view_def.then(function(form_fields_view) {
                new common.FormViewDialog(this, {
                    res_model: model,
                    res_id: res_id,
                    alternative_form_view: form_fields_view,
                    context: data.build_context(record),
                    readonly: event.data.readonly,
                    title: _t("Open: ") + event.data.string,
                    read_function: function() {
                        return self.datamodel.load(model, {
                            id: res_id,
                            fields: form_fields_view.fields,
                        }).then(function(db_id) {
                            return [self.datamodel.get(db_id).data];
                        });
                    },
                    write_function: function(id, changes) {
                        // FIXME: write on the record form_view's db_id (unknown as we still use the old
                        // form view in dialog) and reload the o2m. So for now, it doesn't work if we
                        // try to save a field that isn't in the kanban
                        return self.datamodel.save(record.id, changes).done(function() { //FIXME
                            if (event.data.on_success) {
                                event.data.on_success(self.datamodel.get(event.data.db_id));
                            }
                        });
                    },
                }).open();
            });
        },
        toggle_column_order: function(event) {
            var self = this;
            this.datamodel
                .set_sort(event.data.id, event.data.name)
                .reload(event.data.id)
                .then(function() {
                    self.update_state(self.data);
                });
        },
        call_button: function(event) {
            var self = this;
            var def;

            var attrs = event.data.attrs;
            if (attrs.confirm) {
                var d = $.Deferred();
                Dialog.confirm(this, attrs.confirm, { confirm_callback: function() {
                    self.call_button_action(attrs, event.data.record);
                }}).on("closed", null, function() { d.resolve(); });
                def = d.promise();
            } else {
                def = this.call_button_action(attrs, event.data.record);
            }
            if (event.data.show_wow) {
                def.always(function() {
                    self.show_wow();
                });
            }
        },
        do_action: function(event) {
            this.do_action(event.data.action, event.data.options || {}).then(function (result) {
                if (event.data.on_success) {
                    event.data.on_success(result);
                }
            });
        },
        bounce_edit: function() {
            if (this.$buttons) {
                this.$buttons.find('.o_form_button_edit').openerpBounce();
            }
        },
    }),
    init: function () {
        this._super.apply(this, arguments);
        this.fields.display_name = this.fields.display_name || {type: "char"};
        this.mode = 'readonly'; // can be: readonly, edit
        this.dataset_ids = this.options.dataset ? this.options.dataset.res_ids : this.dataset.ids;
        this.current_id = this.options.dataset ? this.options.dataset.current_id : this.dataset.ids[this.dataset.index];
    },
    start: function() {
        var def;
        if (this.current_id) {
            def = this.load_record(this.current_id)
                    .then(this.update_state.bind(this));
        } else {
            def = this.create_record();
        }
        return $.when(this._super, def);
    },
    load_record: function(id) {
        var index = _.indexOf(this.dataset_ids, this.current_id);
        return this.datamodel.load(this.model, {
            id: id,
            context: this.options.action.context,
            res_ids: this.dataset_ids,
            offset: index
        });
    },
    do_show: function (view_options) {
        var defs = [];
        defs.push(this._super.apply(this, arguments));
        if (this.has_been_started) {
            var dataset = view_options && view_options.dataset;
            this.dataset_ids = dataset ? dataset.res_ids : this.dataset.ids;
            this.current_id = dataset ? dataset.current_id : this.dataset.ids[this.dataset.index];
            defs.push(this.load_record(this.current_id).then(this.update_state.bind(this)));
        }
        this.has_been_started = true;
        return $.when.apply($, defs);
    },
    render_buttons: function($node) {
        var widget = {
            is_action_enabled: function() { return true;}
        };
        this.$buttons = $('<div/>');

        var $footer = this.$('footer');
        if (this.options.action_buttons !== false || this.options.footer_to_buttons && $footer.children().length === 0) {
            this.$buttons.append(qweb.render("FormView.buttons", {'widget': widget}));
        }
        if (this.options.footer_to_buttons) {
            $footer.appendTo(this.$buttons);
        }

        this.$buttons.find('.o_form_button_edit').click(this.to_edit_mode.bind(this));
        this.$buttons.find('.o_form_button_save').click(this.save_record.bind(this));
        this.$buttons.find('.o_form_button_cancel').click(this.discard_changes.bind(this));
        this.$buttons.find('.o_form_button_create').click(this.create_record.bind(this));
        if (this.mode === 'readonly') {
            this.$buttons.find('.o_form_buttons_edit').addClass('o_hidden');
        }
        if (this.mode === 'edit') {
            this.$buttons.find('.o_form_buttons_view').addClass('o_hidden');
        }
        this.$buttons.appendTo($node);
    },
    /**
     * Instantiate and render the sidebar if a sidebar is requested
     * Sets this.sidebar
     * @param {jQuery} [$node] a jQuery node where the sidebar should be inserted
     **/
    render_sidebar: function($node) {
        if (!this.sidebar && this.options.sidebar) {
            this.sidebar = new Sidebar(this, {editable: this.is_action_enabled('edit')});
            if (this.fields_view.toolbar) {
                this.sidebar.add_toolbar(this.fields_view.toolbar);
            }
            this.sidebar.add_items('other', _.compact([
                this.is_action_enabled('delete') && { label: _t('Delete'), callback: this.delete_record.bind(this) },
                this.is_action_enabled('create') && { label: _t('Duplicate'), callback: this.duplicate_record.bind(this) }
            ]));

            this.sidebar.appendTo($node);

            // Show or hide the sidebar according to the view mode
            this.toggle_sidebar();
        }
    },
    /**
     * Show or hide the sidebar according to the actual_mode
     */
    toggle_sidebar: function() {
        if (this.sidebar) {
            this.sidebar.do_toggle(this.mode === 'readonly');
        }
    },
    to_edit_mode: function() {
        this.mode = "edit";
        if (this.$buttons) {
            this.$buttons.find('.o_form_buttons_edit').removeClass('o_hidden');
            this.$buttons.find('.o_form_buttons_view').addClass('o_hidden');
        }
        this.$el.addClass('o_form_editable');
        this.update_state(this.db_id);
    },
    to_readonly_mode: function() {
        this.mode = "readonly";
        this.$buttons.find('.o_form_buttons_edit').addClass('o_hidden');
        this.$buttons.find('.o_form_buttons_view').removeClass('o_hidden');
        this.$el.removeClass('o_form_editable');
        this.update_state(this.db_id);
    },
    save_record: function() {
        if (!this.datamodel.is_dirty(this.db_id)) {
            this.to_readonly_mode();
        } else {
            var invalid_fields = this.renderer.check_invalid_fields();
            if (invalid_fields.length) {
                this.notify_invalid_fields(invalid_fields);
            } else {
                this.datamodel.save(this.db_id).then(this.to_readonly_mode.bind(this));
            }
        }
    },
    delete_record: function() {
        var self = this;
        function do_it() {
            return self.datamodel
                .delete_records([self.current_id], self.model)
                .then(function () {
                    var index = self.dataset_ids.indexOf(self.current_id);
                    self.dataset_ids.splice(index, 1);
                    self.current_id = self.dataset_ids[index];
                    if (!self.current_id) {
                        self.current_id = self.dataset_ids[self.dataset_ids.length - 1];
                    }
                    if (!self.current_id) {
                        self.do_action('history_back');
                    } else {
                        self.load_record(self.current_id).then(self.update_state.bind(self));
                    }
                });
        }

        if (this.options.confirm_on_delete && this.current_id) {
            Dialog.confirm(this, _t("Are you sure you want to delete this record ?"), { confirm_callback: do_it });
        } else {
            do_it();
        }
    },
    duplicate_record: function() {
        var self = this;
        var action_context = this.options.action.context;
        this.datamodel.duplicate_record(this.db_id, action_context).then(function(db_id) {
            self.db_id = db_id;
            var record = self.datamodel.get(db_id);
            var index = self.dataset_ids.indexOf(self.current_id);
            self.current_id = record.data.id;
            self.dataset_ids.splice(index + 1, 0, self.current_id);
            self.to_edit_mode();
        });
    },
    discard_changes: function() {
        if (!this.datamodel.is_dirty(this.db_id)) {
            return this.to_readonly_mode();
        }
        var self = this;
        this.can_be_discarded().then(function() {
            self.datamodel.discard_changes(self.db_id);
            if (self.current_id) {
                self.to_readonly_mode();
            } else {
                self.do_action('history_back');
            }
        });
    },
    create_record: function() {
        var self = this;
        var action_context = this.options.action.context;
        return this.datamodel.make_record_with_defaults(this.model, action_context).then(function (id) {
            self.db_id = id;
            self.current_id = undefined;
            self.to_edit_mode();
        });
    },
    can_be_discarded: function() {
        var message = _t("The record has been modified, your changes will be discarded. Are you sure you want to leave this page ?");
        var def = $.Deferred();
        var options = {
            title: _t("Warning"),
            confirm_callback: function() {
                this.on('closed', null, def.resolve.bind(def));
            },
            cancel_callback: def.reject.bind(def)
        };
        var dialog = Dialog.confirm(this, message, options);
        dialog.$modal.on('hidden.bs.modal', def.reject.bind(def));
        return def;
    },
    call_button_action: function(attrs, record) {
        var self = this;
        var def = $.Deferred();
        record = record || this.datamodel.get(this.db_id);
        var record_id = record.data.id;
        this.trigger_up('execute_action', {
            action_data: _.extend({}, attrs, { context: data.build_context(record, attrs.context) }),
            dataset: this.dataset,
            record_id: record_id,
            on_close: function(reason) {
                if (!_.isObject(reason)) {
                    return self.load_record(record_id).then(self.update_state.bind(self));
                }
            },
            on_fail: function() {
                self.load_record(record_id).then(function(db_id) {
                    self.update_state(db_id);
                    def.resolve();
                });
            },
            on_success: def.resolve.bind(def),
        });
        return def;
    },
    show_wow: function() {
        var others = ['o_wow_peace', 'o_wow_heart'];
        var wow_class = Math.random() <= 0.9 ? 'o_wow_thumbs' : _.sample(others);
        var $body = $('body');
        $body.addClass(wow_class);
        setTimeout(function() {
            $body.removeClass(wow_class);
        }, 1000);
    },
    notify_invalid_fields: function(invalid_fields) {
        var warnings = invalid_fields.map(function (field_name) {
            return _.str.sprintf('<li>%s</li>', _.escape(field_name));
        });
        warnings.unshift('<ul>');
        warnings.push('</ul>');
        this.do_warn(_lt("The following fields are invalid:"), warnings.join(''));
    },
    autofocus: function () {
        // to be implemented
    },
    get_selected_ids: function() {
        // FIX ME : fix sidebar widget
        return this.current_id ? [this.current_id] : [];
    },
    on_field_changed: function (event) {
        if (this.mode === 'readonly') {
            event.data.force_save = true;
        }
        this._super.apply(this, arguments);
    },
    confirm_save: function() {
        this.reload();
    },
    confirm_onchange: function (id, fields) {
        var record = this.datamodel.get(id);
        this.renderer.update_widgets(fields, record);
    },
    get_renderer_options: function() {
        return {
            view_is_editable: this.is_action_enabled('edit'),
            mode: this.mode
        };
    },
    update_renderer: function() {
        var state = this.datamodel.get(this.db_id);
        this.renderer.update(state, {mode: this.mode});
    },
});


return FormView;

});
