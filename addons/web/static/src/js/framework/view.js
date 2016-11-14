odoo.define('web.View', function (require) {
"use strict";

var core = require('web.core');
var Widget = require('web.Widget');

var View = Widget.extend({
    events: {
        'click a[type=action]': function (ev) {
            ev.preventDefault();
            var action_data = $(ev.target).attr('name');
            this.do_action(action_data);
        }
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
    init: function(parent, dataset, fields_view, options) {
        this._super(parent);
        this.ViewManager = parent;
        this.dataset = dataset;
        this.model = dataset.model;
        this.fields_view = fields_view;
        this.fields = fields_view.fields;
        this.options = _.defaults({}, options, this.defaults);
    },
    /**
     * Triggers event 'view_loaded'.
     * Views extending start() must call this.super() once they are ready.
     * @return {Deferred}
     */
    start: function() {
        // add classname that reflect the (absence of) access rights
        this.$el.toggleClass('o_cannot_create', !this.is_action_enabled('create'));
        return this._super().then(this.trigger.bind(this, 'view_loaded'));
    },
    do_show: function () {
        this._super();
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
     * This function should render the action buttons of the view.
     * It should be called after start().
     * @param {jQuery} [$node] a jQuery node where the rendered buttons should be inserted
     * $node may be undefined, in which case the View can insert the buttons somewhere else
     */
    render_buttons: function($node) {
    },
    /**
     * This function should render the sidebar of the view.
     * It should be called after start().
     * @param {jQuery} [$node] a jQuery node where the sidebar should be inserted
     * $node may be undefined, in which case the View can insert the sidebar somewhere else
     */
    render_sidebar: function($node) {
    },
    /**
     * This function should render the pager of the view.
     * It should be called after start().
     * @param {jQuery} [$node] a jQuery node where the pager should be inserted
     * $node may be undefined, in which case the View can insert the pager somewhere else
     */
    render_pager: function($node) {
    },
    /**
     * Switches to a specific view type
     */
    do_switch_view: function() {
        this.trigger.apply(this, ['switch_mode'].concat(_.toArray(arguments)));
    },
    do_search: function(domain, context, group_by) {
    },
    sidebar_eval_context: function () {
        return $.when({});
    },
    /**
     * Asks the view to reload itself, if the reloading is asynchronous should
     * return a {$.Deferred} indicating when the reloading is done.
     */
    reload: function () {
        return $.when();
    },
    /**
     * Return whether the user can perform the action ('create', 'edit', 'delete') in this view.
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
    destroy: function () {
        if (this.$buttons) {
            this.$buttons.off();
        }
        return this._super.apply(this, arguments);
    },
    set_scrollTop: function(scrollTop) {
        this.scrollTop = scrollTop;
    },
    get_scrollTop: function() {
        return this.scrollTop;
    }
});

return View;

});
