odoo.define('hr_holidays.dashboard', function (require) {
"use strict";

var core = require('web.core');
var Model = require('web.Model');
var KanbanView = require('web_kanban.KanbanView');

var QWeb = core.qweb;

var _lt = core._lt;

var HrHolidaysDashboardView = KanbanView.extend({
    display_name: _lt('Dashboard'),
    icon: 'fa-dashboard',
    searchview_hidden: true,
    events: {
        'click .o_dashboard_action': 'on_dashboard_action_clicked',
    },

    fetch_data: function() {
        return new Model('hr.department')
            .call('retrieve_dashboard_data', []);
    },

    render: function() {
        var super_render = this._super;
        var self = this;

        return this.fetch_data().then(function(result){
            var hr_holidays_dashboard = QWeb.render('hr_holidays.HrHolidaysDashboard', {
                data: result,
            });
            super_render.call(self); // can I replace by super_render() instead of calling with self ?
            $(hr_holidays_dashboard).prependTo(self.$el);
        });
    },

    on_dashboard_action_clicked: function(ev){
        ev.preventDefault();
        var self = this;
        var $action = $(ev.currentTarget);
        var action_name = $action.attr('name');
        var action_additional_context = $action.data('context');
        // var action_additional_context = $action.attr('additional_context');
        // if (action_additional_context) {
        //     action_additional_context = JSON.parse(action_additional_context);
        // }

        self.do_action(action_name, {additional_context: action_additional_context});
    },
});

core.view_registry.add('hr_holidays_dashboard', HrHolidaysDashboardView);

return HrHolidaysDashboardView

});
