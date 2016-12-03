odoo.define('web.Action', function(require) {
"use strict";

var Widget = require('web.Widget');
var ControlPanel = require('web.ControlPanel');


var Action = Widget.extend({
    template: 'Action',
    config: {
        MainWidget: null,
    },
    init: function(parent, actionDescr, options) {
        this._super.apply(this, arguments);

        this.actionDescr = actionDescr;
        this.withControlPanel = options.withControlPanel;
        this.previousBreadcrumbs = options.previousBreadcrumbs;
        this.searchArch = options.searchArch;
        this.title = actionDescr.name;
        this._setBreadCrumbs();
    },

    willStart: function() {
        if (this.withControlPanel) {
            return this.setupControlPanel();
        }
        return $.when();
    },
    setupControlPanel: function() {
        var config = {
            previousBreadcrumbs: this.previousBreadcrumbs,
            currentBreadcrumbs: this.breadcrumbs,
            searchViewFVG: this.searchViewFVG,
        };
        this.controlPanel = new ControlPanel(this, config);
        return this.controlPanel.appendTo($('<div>'));
    },

    start: function() {
        if (this.withControlPanel) {
            this.controlPanel.$el.detach();
            this.controlPanel.$el.prependTo(this.$el);
        }
    },
    // returns a list of breadcrumbs
    // for example, [{id: 'whatever', string: 'Contacts'}]
    getBreadcrumbs: function() {
        return this.breadcrumbs;
    },
    setBreadCrumbs: function() {
        this._setBreadCrumbs();
        if (this.withControlPanel) {
            var previous = this.previousBreadcrumbs;
            var current = this.breadcrumbs;
            this.controlPanel.updateBreadcrumbs(previous, current);
        }
    },
    // to be implemented by action
    // need to set the this.breadcrumbs to a list of strings
    _setBreadCrumbs: function() {
        this.breadcrumbs = [this.title];
    },
});

return Action;

});

