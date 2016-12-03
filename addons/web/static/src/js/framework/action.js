odoo.define('web.Action', function(require) {
"use strict";

var Widget = require('web.Widget');
var ControlPanel = require('web.ControlPanel');


var Action = Widget.extend({
    template: 'Action',
    config: {
        MainWidget: null,
    },
    init: function(parent, options) {
        this._super.apply(this, arguments);

        this.withControlPanel = options.withControlPanel;
        this.currentBreadcrumbs = options.currentBreadcrumbs;
    },
    willStart: function() {
        if (this.withControlPanel) {
            return this.setupControlPanel();
        }
        return $.when();
    },
    start: function() {
        if (this.withControlPanel) {
            this.controlPanel.$el.detach();
            this.controlPanel.$el.prependTo(this.$el);
        }
    },
    setupControlPanel: function() {
        this.controlPanel = new ControlPanel();
        return this.controlPanel.appendTo($('<div>'));
    },
});

return Action;

});

