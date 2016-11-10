odoo.define('web.GraphView', function (require) {
"use strict";
/*---------------------------------------------------------
 * Odoo Graph view
 *---------------------------------------------------------*/

var core = require('web.core');
var GraphModel = require('web.GraphModel');
var GraphRenderer = require('web.GraphRenderer');
var AbstractView = require('web.AbstractView');

var _lt = core._lt;
var _t = core._t;
var qweb = core.qweb;

var GraphView = AbstractView.extend({
    className: 'o_graph',
    display_name: _lt('Graph'),
    icon: 'fa-bar-chart',
    config: _.extend({}, AbstractView.prototype.config, {
        Model: GraphModel,
        Renderer: GraphRenderer,
    }),

    init: function() {
        var self = this;
        this._super.apply(this, arguments);
        this.measures = [];
        _.each(this.fields, function (field, name) {
            if (name !== 'id' && field.store === true) {
                if (field.type === 'integer' || field.type === 'float' || field.type === 'monetary') {
                    self.measures[name] = field;
                }
            }
        });
        self.measures.__count__ = {string: _t("Count"), type: "integer"};
    },
    /**
     * Render the buttons according to the GraphView.buttons and
     * add listeners on it.
     * Set this.$buttons with the produced jQuery element
     * @param {jQuery} [$node] a jQuery node where the rendered buttons should be inserted
     * $node may be undefined, in which case the GraphView does nothing
     */
    render_buttons: function ($node) {
        if ($node) {
            var context = {measures: _.pairs(_.omit(this.measures, '__count__'))};
            this.$buttons = $(qweb.render('GraphView.buttons', context));
            this.$measure_list = this.$buttons.find('.o_graph_measures_list');
            this.$buttons.find('button').tooltip();
            this.$buttons.click(this.on_button_click.bind(this));
            this.update_buttons();
            this.$buttons.appendTo($node);
        }
    },
    update_buttons: function () {
        var state = this.datamodel.get(this.db_id);
        this.$buttons.find('.o_graph_button').removeClass('active');
        this.$buttons.find('.o_graph_button[data-mode="' + state.mode + '"]').addClass('active');
        this.$measure_list.find('li').each(function (index, li) {
            $(li).toggleClass('selected', $(li).data('field') === state.measure);
        });
    },
    set_mode: function(mode) {
        this.datamodel.set_mode(this.db_id, mode);
        var state = this.datamodel.get(this.db_id);
        this.renderer.update(state);
    },
    _load_data: function(domain, context, group_by) {
        return this.datamodel
            .load(this.model, {
                domain: domain,
                grouped_by: group_by,
                context: context,
            });
    },
    get_context: function () {
        var state = this.db_id ? this.datamodel.get(this.db_id) : false;
        return !state ? {} : {
            graph_mode: state.mode,
            graph_measure: state.measure,
            graph_groupbys: state.grouped_by
        };
    },
    on_button_click: function (event) {
        var $target = $(event.target);
        if ($target.hasClass('o_graph_button')) {
            this.set_mode($target.data('mode'));
            this.update_state(this.db_id);
        }
        else if ($target.parents('.o_graph_measures_list').length) {
            var parent = $target.parent();
            var field = parent.data('field');
            this.datamodel.set_measure(this.db_id, field)
                          .reload(this.db_id)
                          .then(this.update_state.bind(this));
            event.preventDefault();
            event.stopPropagation();
        }
    },
    destroy: function () {
        if (this.$buttons) {
            this.$buttons.find('button').off(); // remove jquery's tooltip() handlers
        }
        return this._super.apply(this, arguments);
    },
    get_renderer_options: function() {
        return {mode: this.datamodel.get(this.db_id).mode};
    },
});

return GraphView;

});
