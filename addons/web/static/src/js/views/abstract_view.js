odoo.define('web.AbstractView', function (require) {
"use strict";

var BasicModel = require('web.BasicModel');
var core = require('web.core');
var Dialog = require('web.Dialog');
var Pager = require('web.Pager');
var FieldManagerMixin = require('web.FieldManagerMixin');
var Widget = require('web.Widget');

var _t = core._t;

var AbstractView = Widget.extend(FieldManagerMixin, {
    config: {
        Model: BasicModel,
        Renderer: undefined, // to be set
        open_groups_by_default: false,
        page_size: 40,
        hasPager: true,  // TODO: change this into false
    },
    defaults: {
        action: {},
    },
    // name displayed in view switchers
    display_name: '',
    // used by views that need a searchview.
    searchable: true,
    // used by views that need a searchview but don't want it to be displayed.
    searchview_hidden: false,
    // multi_record is used to distinguish views displaying a single record
    // (e.g. FormView) from those that display several records (e.g. ListView)
    multi_record: true,
    // indicates whether or not the view is mobile-friendly
    mobile_friendly: false,
    // icon is the font-awesome icon to display in the view switcher
    icon: 'fa-question',

    events: {
        'click a[type=action]': function (ev) {
            ev.preventDefault();
            var action_data = $(ev.target).attr('name');
            this.do_action(action_data);
        }
    },
    custom_events: _.extend({}, FieldManagerMixin.custom_events, {
        open_record: function(event) {
            this.open_record(event.data.id);
        },
        edit_record: function(event) {
            this.open_record(event.data.id, {mode: 'edit'});
        },
        reload: 'reload',
        // TODO: add open_action, ...
    }),

    init: function(parent, dataset, fields_view, options) {
        this._super.apply(this, arguments);
        this.ViewManager = parent; // remove that
        this.dataset = dataset;
        this.model = dataset.model;
        this.fields_view = fields_view;
        this.fields = fields_view.fields;
        this.arch = fields_view.arch;
        this.options = _.defaults({}, options, this.defaults);
        var Model = this.config.Model;
        FieldManagerMixin.init.call(this, new Model(fields_view));
        if (this.multi_record) {
            this.config.page_size = this.options.limit ||
                                    parseInt(this.arch.attrs.limit, 10) ||
                                    this.config.page_size;
        }
    },
    start: function() {
        this.$el.toggleClass('o_cannot_create', !this.is_action_enabled('create'));
        return this._super.apply(this, arguments);
    },
    destroy: function () {
        if (this.$buttons) {
            this.$buttons.off();
        }
        return this._super.apply(this, arguments);
    },
    do_show: function() {
        this._super.apply(this, arguments);
        core.bus.trigger('view_shown', this);
    },
    do_push_state: function(state) {
        if (this.getParent() && this.getParent().do_push_state) {
            this.getParent().do_push_state(state);
        }
    },
    do_load_state: function (state, warm) {
    },
    /**
     * Switches to a specific view type
     */
    do_switch_view: function() {
        this.trigger.apply(this, ['switch_mode'].concat(_.toArray(arguments)));
    },
    get_renderer_options: function() {
        return {};
    },
    has_content: function(state) {
        return state.count;
    },
    open_record: function(id, options) {
        // TODO: move this to view manager at some point
        var state = this.datamodel.get(this.db_id);
        var record = this.datamodel.get(id);
        var res_ids;
        if (state.grouped_by.length) {
            res_ids = _.pluck(_.flatten(_.pluck(state.data, 'data')), 'res_id');
        } else {
            res_ids = _.pluck(state.data, 'res_id');
        }
        options = _.extend({}, options, {
            dataset: {
                res_ids: res_ids,
                current_id: record.res_id,
            },
        });
        this.trigger_up('switch_view', {
            view_type: 'form',
            options: options,
        });
    },
    delete_records: function(ids) {
        var self = this;
        function do_it() {
            return self.datamodel
                .delete_records(ids, self.model, self.db_id)
                .then(self.update_state.bind(self));
        }
        if (this.options.confirm_on_delete) {
            Dialog.confirm(this, _t("Are you sure you want to delete this record ?"), { confirm_callback: do_it });
        } else {
            do_it();
        }
    },
    update_state: function(db_id) {
        this.db_id = db_id;
        var state = this.datamodel.get(db_id);
        if (state.is_record) {
            this.set({ title : state.res_id ? state.data.display_name : _t("New") });
        }
        if (this.pager && this.config.hasPager) {
            this.update_pager();
        }
        if (this.$buttons) {
            this.update_buttons();
        }
        this.$('.oe_view_nocontent').remove();
        if (!this.has_content(state) && this.no_content_help) {
            var $msg = $('<div>')
                        .addClass('oe_view_nocontent')
                        .html(this.no_content_help);
            this.$el.append($msg);
            if (this.renderer) {
                this.renderer.do_hide();
            }
            return;
        }
        if (this.renderer) {
            this.update_renderer();
            this.renderer.do_show();
        } else {
            var Renderer = this.config.Renderer;
            var options = this.get_renderer_options();
            this.renderer = new Renderer(this, this.arch, state, options);
            this.renderer.appendTo(this.$el);
        }
        var params = state.res_id ? {id: state.res_id} : {};
        this.do_push_state(params);
        core.bus.trigger('view_shown');
    },
    reload: function() {
        return this.datamodel.reload(this.db_id).then(this.update_state.bind(this));
    },
    update_renderer: function() {
        var state = this.datamodel.get(this.db_id);
        return this.renderer.update(state);
    },
    render_buttons: function($node) {
    },
    render_pager: function($node, options) {
        var data = this.datamodel.get(this.db_id);
        this.pager = new Pager(this, data.count || 1, data.offset + 1, this.config.page_size, options);

        this.pager.on('pager_changed', this, function (new_state) {
            var self = this;
            var data = this.datamodel.get(this.db_id);
            this.pager.disable();
            var limit_changed = (this.config.page_size !== new_state.limit);
            this.config.page_size = new_state.limit;
            this.datamodel
                .set_limit(data.id, new_state.limit)
                .set_offset(data.id, new_state.current_min - 1)
                .reload(data.id)
                .then(function (state) {
                    self.update_state(state);
                    // Reset the scroll position to the top on page changed only
                    if (!limit_changed) {
                        self.trigger_up('scrollTo', {offset: 0});
                    }
                })
                .then(this.pager.enable.bind(this.pager));
        });
        this.pager.appendTo($node = $node || this.options.$pager);
        this.update_pager();  // to force proper visibility
    },
    render_sidebar: function($node) {
    },
    update_buttons: function() {
    },
    update_pager: function() {
        var data = this.datamodel.get(this.db_id);
        this.pager.update_state({
            current_min: data.offset + 1,
            size: data.count,
        });
        var is_pager_visible = data.is_record || (!!data.count && (data.grouped_by && !data.grouped_by.length));
        this.pager.do_toggle(is_pager_visible);
    },
    do_search: function (domain, context, group_by) {
        var load = this.db_id ? this._reload_data : this._load_data;
        return load.call(this, domain, context, group_by).then(this.update_state.bind(this));
    },
    _load_data: function(domain, context, group_by) {
        return this.datamodel
            .load(this.model, {
                domain: domain,
                grouped_by: group_by,
                context: context,
                limit: this.config.page_size,
                many2manys: this.many2manys,
                m2m_context: this.m2m_context,
                open_group_by_default: this.config.open_groups_by_default,
            });
    },
    _reload_data: function(domain, context, group_by) {
        return this.datamodel
            .set_domain(this.db_id, domain)
            .set_context(this.db_id, context)
            .set_group_by(this.db_id, group_by)
            .reload(this.db_id);
    },
    sidebar_eval_context: function () {
        return $.when({});
    },
    /**
     * Return whether the user can perform a given action (e.g. 'create', 'edit') in this view.
     * An action is disabled by setting the corresponding attribute in the view's main element,
     * like: <form string="" create="false" edit="false" delete="false">
     */
    is_action_enabled: function(action) {
        var attrs = this.fields_view.arch.attrs;
        return (action in attrs) ? JSON.parse(attrs[action]) : true;
    },
    get_context: function () {
        return {};
    },
    set_scrollTop: function(scrollTop) {
        this.scrollTop = scrollTop;
    },
    get_scrollTop: function() {
        return this.scrollTop;
    }
});

return AbstractView;

});
