odoo.define('web.ListView', function (require) {
"use strict";

var core = require('web.core');
var AbstractView = require('web.AbstractView');
var DataExport = require('web.DataExport');
var ListRenderer = require('web.ListRenderer');
var pyeval = require('web.pyeval');
var Sidebar = require('web.Sidebar');

var _t = core._t;
var _lt = core._lt;
var qweb = core.qweb;

var ListView = AbstractView.extend({
    accesskey: "l",
    display_name: _lt('List'),
    icon: 'fa-list-ul',
    config: _.extend({}, AbstractView.prototype.config, {
        page_size: 80,
        Renderer: ListRenderer,
    }),

    custom_events: _.extend({}, AbstractView.prototype.custom_events, {
        toggle_column_order: function(event) {
            var data = this.datamodel.get(this.db_id);
            if (!data.grouped_by) {
                this.pager.update_state({current_min: 1});
            }
            this.datamodel
                .set_sort(data.id, event.data.name)
                .reload(data.id)
                .then(this.update_state.bind(this));
        },
        toggle_group: function(event) {
            var self = this;
            this.datamodel
                .toggle_group(event.data.group.id)
                .then(function() { return self.db_id;})
                .then(this.update_state.bind(this));
        },
        record_changed: function(event) {
            var self = this;
            var id = event.data.__record_id;
            delete event.data.__record_id;
            this.datamodel
                .save(id, event.data)
                .then(function(result) {
                    self.renderer.confirm_save(result);
                });
        },
        selection_changed: function(event) {
            this.selected_records = event.data.selection;
            this.toggle_sidebar();
        },
    }),
    init: function () {
        this._super.apply(this, arguments);
        this.no_content_help = this.options.action.help;
        this.is_editable = this.arch.attrs.editable;
    },
    do_search: function () {
        this.selected_records = []; // there is no selected record by default
        this.toggle_sidebar();
        return this._super.apply(this, arguments);
    },
    render_buttons: function($node) {
        var widget = {
            options: {addable: 'Create', import_enabled: true},
            is_action_enabled: function() { return true;}
        };
        if (!this.$buttons) {
            this.$buttons = $(qweb.render("ListView.buttons", {'widget': widget}));
            this.$buttons.find('.o_list_button_add').click(this.proxy('create_record'));
            this.$buttons.appendTo($node);
        }
    },
    render_sidebar: function($node) {
        if (!this.sidebar && this.options.sidebar) {
            this.sidebar = new Sidebar(this, {editable: this.is_action_enabled('edit')});
            if (this.fields_view.toolbar) {
                this.sidebar.add_toolbar(this.fields_view.toolbar);
            }
            var archive_enabled = this.fields_view.fields.active;
            this.sidebar.add_items('other', _.compact([
                { label: _t("Export"), callback: this.export_data.bind(this) },
                archive_enabled && { label: _t("Archive"), callback: this.archive_selection.bind(this, true) },
                archive_enabled && { label: _t("Unarchive"), callback: this.archive_selection.bind(this, false) },
                this.is_action_enabled('delete') && { label: _t('Delete'), callback: this.delete_selected_records.bind(this) },
            ]));

            $node = $node || this.options.$sidebar;
            this.sidebar.appendTo($node);

            this.toggle_sidebar();
        }
    },
    toggle_sidebar: function () {
        if (this.sidebar) {
            this.sidebar.do_toggle(this.selected_records.length > 0);
        }
    },
    create_record: function() {
        this.dataset.index = null;
        this.do_switch_view('form');
    },
    confirm_onchange: function(id, values) {
        this.renderer.confirm_onchange(id, values);
    },
    delete_selected_records: function () {
        return this.delete_records(this.selected_records);
    },
    archive_selection: function(archive) {
        return this.archive(this.selected_records, archive);
    },
    archive: function (ids, archive) {
        if (ids.length === 0) {
            return $.when();
        }
        return this.datamodel
            .toggle_active(ids, !archive, this.db_id)
            .then(this.update_state.bind(this));
    },
    export_data: function() {
        new DataExport(this, this.dataset).open();
    },
    /**
     * Calculate the active domain of the list view. This should be done only
     * if the header checkbox has been checked. This is done by evaluating the
     * search results, and then adding the dataset domain (i.e. action domain).
     */
    get_active_domain: function () {
        var self = this;
        if (this.$('thead .o_list_record_selector input').prop('checked')) {
            var search_view = this.getParent().searchview; // fixme
            var search_data = search_view.build_search_data();
            return pyeval.eval_domains_and_contexts({
                domains: search_data.domains,
                contexts: search_data.contexts,
                group_by_seq: search_data.groupbys || []
            }).then(function (results) {
                return self.dataset.domain.concat(results.domain || []);
            });
        } else {
            return $.Deferred().resolve();
        }
    },
    get_selected_ids: function() {
        var self = this;
        return _.map(this.selected_records, function (db_id) {
            return self.datamodel.get(db_id).res_id;
        });
    },
    get_renderer_options: function() {
        return { has_selectors: true };
    },
    update_renderer: function() {
        var state = this.datamodel.get(this.db_id);
        this.renderer.update(state, this.selected_records);
    },
});

return ListView;

});
