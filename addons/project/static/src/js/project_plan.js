odoo.define('project_timesheet.project_plan', function (require) {
'use strict';

var ajax = require('web.ajax');
var core = require('web.core');
var data = require('web.data');
var Widget = require('web.Widget');
var Model = require('web.Model');
var session = require('web.session');

var ControlPanelMixin = require('web.ControlPanelMixin');

var QWeb = core.qweb;
var _t = core._t;


var PlanAction = Widget.extend(ControlPanelMixin, {
    events: {
        "click a[type='action']": "onclick_action",
        "click button[type='action']": "onclick_action",
    },
    init: function(parent, action, options) {
        this._super.apply(this, arguments);
        this.project_id = action.context['active_id'];
        this.action_manager = parent;
        this.action = action;
    },
    willStart: function(){
        var self = this;
        // load dom from controller
        return $.when(this._load_dom_plan(), this._super.apply(this, arguments)).then(function(data){
            self._dom = data[0];
            self.update_cp();
        });
    },
    start: function(){
        var self = this;
        return this._super.apply(this, arguments).then(function(data){
            self.$el.html(self._dom); // insert dom
        });
    },
    _load_dom_plan: function(){
        return $.get('/project/plan/' + this.project_id);
    },
    update_cp: function () {
        this.update_control_panel({
            breadcrumbs: this.action_manager.get_breadcrumbs(),
            /*
            cp_content: {
                $buttons: this.$buttons,
                $searchview: this.searchview.$el,
                $searchview_buttons: this.$searchview_buttons,
            },
            searchview: this.searchview,
            */
        });
    },
    // actions
    onclick_action: function(ev){
        var action_id = ev.currentTarget.name;
        var $target = this.$(ev.currentTarget);

        var context = {
            active_id: this.action.context.active_id,
            active_ids: this.action.context.active_ids,
            active_model: this.action.context.active_model || 'project.project',
        }

        if($target.data('context')){
            context = _.extend(context, $target.data('context'));
        }

        this.action_manager.do_action(action_id, {
            additional_context: context
        });
    },
});

core.action_registry.add('project.plan', PlanAction);

});
