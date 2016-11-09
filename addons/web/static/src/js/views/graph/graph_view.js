odoo.define('web.GraphView', function (require) {
"use strict";
/*---------------------------------------------------------
 * Odoo Graph view
 *---------------------------------------------------------*/

var core = require('web.core');
var data_manager = require('web.data_manager');
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
    require_fields: true,
    config: _.extend({}, AbstractView.prototype.config, {
        Model: GraphModel,
        Renderer: GraphRenderer,
    }),

    init: function(parent, dataset, fields_view) {
        var self = this;
        this.measures = [];
        this.initial_measure = '__count__';
        this.initial_groupbys = [];
        fields_view.arch.children.forEach(function (field) {
            var name = field.attrs.name;
            if (field.attrs.interval) {
                name += ':' + field.attrs.interval;
            }
            if (field.attrs.type === 'measure') {
                self.initial_measure = name;
            } else {
                self.initial_groupbys.push(name);
            }
        });
        this._super.apply(this, arguments);
    },
    willStart: function () {
        var self = this;
        var fields_def = data_manager.load_fields(this.dataset).then(function(fields) {
            self.fields = fields;
            _.each(fields, function (field, name) {
                if ((name !== 'id') && (field.store === true)) {
                    if (field.type === 'integer' || field.type === 'float' || field.type === 'monetary') {
                        self.measures[name] = field;
                    }
                }
            });
            self.measures.__count__ = {string: _t("Count"), type: "integer"};
        });
        return $.when(this._super(), fields_def);
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
        this.$buttons.find('.o_graph_button[data-mode="' + this.mode + '"]').addClass('active');
        this.$measure_list.find('li').each(function (index, li) {
            $(li).toggleClass('selected', $(li).data('field') === state.measure);
        });
    },
    do_search: function (domain, context, group_by) {
        if (!this.renderer) {
            this.initial_groupbys = context.graph_groupbys || (group_by.length ? group_by : this.initial_groupbys);
        }
        if (!group_by.length) {
            group_by = this.initial_groupbys.slice(0);
        }
        return this._super.call(this, domain, context, group_by);
    },
    set_mode: function(mode) {
        this.mode = mode;
        this.renderer.set_mode(mode);
    },
    _load_data: function(domain, context, group_by) {
        return this.datamodel
            .load(this.model, {
                fields: this.fields,
                domain: domain,
                grouped_by: group_by,
                measure: this.initial_measure,
                context: context,
            });
    },
    get_context: function () {
        var state = this.db_id ? this.datamodel.get(this.db_id) : false;
        return !state ? {} : {
            graph_mode: this.mode,
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
        return {mode: this.mode};
    },
});

return GraphView;

});
