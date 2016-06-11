odoo.define('project.tour', function(require) {
"use strict";

var core = require('web.core');
var tour = require('web_tour.tour');

var _t = core._t;

tour.register('project_tour', {
    'skip_enabled': true,
}, [{
    trigger: '.o_app[data-menu-xmlid="base.menu_main_pm"], .oe_menu_toggler[data-menu-xmlid="base.menu_main_pm"]',
    content: _t('Want a better way to <b>manage your projects</b>? <i>It starts here.</i>'),
    position: 'bottom',
}, {
    trigger: '.o-kanban-button-new',
    extra_trigger: '.o_project_kanban',
    content: _t('Let\'s create your first project.'),
    position: 'right',
}, {
    trigger: 'input.o_project_name',
    content: _t('Choose a <b>project name</b>. (e.g. Website Launch, Product Development, Office Party)'),
    position: 'right',
}, {
    trigger: '.o_project_kanban .o_kanban_record:first-child',
    content: _t('Let\'s <b>go to your project</b> and start organizing tasks.'),
    position: 'right',
}, {
    trigger: ".o_kanban_project_tasks .o_column_quick_create",
    content: _t("Add columns to setup <b>tasks stages</b>.<br/><i>e.g. Specification &gt; Development &gt; Tests</i>"),
    position: "right"
}, {
    trigger: ".o-kanban-button-new",
    extra_trigger: '.o_kanban_project_tasks .o_kanban_group:nth-child(2)',
    content: _t("Now that the project is setup, <b>create a few tasks</b>."),
    position: "right"
}, {
    trigger: ".o_kanban_record:nth-child(3)",
    extra_trigger: '.o_kanban_project_tasks',
    content: _t("<b>Drag &amp; drop tasks</b> between columns as you work on them."),
    position: "right"
}, {
    trigger: ".o_kanban_record .o_priority_star",
    extra_trigger: '.o_kanban_project_tasks',
    content: _t("<b>Star tasks</b> to mark your favorites, the team sprint backlog, priorities, etc."),
    position: "bottom"
}, {
    trigger: ".breadcrumb li:not(.active):last",
    extra_trigger: '.o_form_project_tasks',
    content: _t("Use the breadcrumbs to <b>go back to tasks</b>."),
    position: "bottom"
}]);

});
