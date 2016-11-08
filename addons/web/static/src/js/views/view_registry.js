odoo.define('web.view_registry', function (require) {
"use strict";

var Registry = require('web.Registry');
var FormView = require('web.FormView');
var KanbanView = require('web.KanbanView');
var ListView = require('web.ListView');
var GraphView = require('web.GraphView');

var registry = new Registry();

return registry
    .add('form', FormView)
    .add('list', ListView)
    .add('kanban', KanbanView)
    .add('graph', GraphView);

});


