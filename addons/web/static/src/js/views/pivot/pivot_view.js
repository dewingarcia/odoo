odoo.define('web.PivotView', function (require) {
"use strict";
/*---------------------------------------------------------
 * Odoo Pivot Table view
 *---------------------------------------------------------*/

var AbstractView = require('web.AbstractView');
var core = require('web.core');
var crash_manager = require('web.crash_manager');
var framework = require('web.framework');
var session = require('web.session');
var view_registry = require('web.view_registry');
var PivotModel = require('web.PivotModel');
var PivotRenderer = require('web.PivotRenderer');

var _lt = core._lt;
var _t = core._t;
var QWeb = core.qweb;

var GROUPABLE_TYPES = ['many2one', 'char', 'boolean', 'selection', 'date', 'datetime'];

var PivotView = AbstractView.extend({
    events: {
        'click .o_pivot_header_cell_opened': 'on_open_header_click',
        'click .o_pivot_header_cell_closed': 'on_closed_header_click',
        'click .o_pivot_field_menu a': 'on_field_menu_selection',
        'click td': 'on_cell_click',
        'click .o_pivot_measure_row': 'on_measure_row_click',
    },
    display_name: _lt('Pivot'),
    icon: 'fa-table',
    template: 'PivotView',
    config: _.extend({}, AbstractView.prototype.config, {
        hasPager: false,
        Model: PivotModel,
        Renderer: PivotRenderer,
    }),

    init: function() {
        this._super.apply(this, arguments);
        this.measures = {};
        this.groupable_fields = {};

        // populate this.measures and this.groupable_fields
        this.prepare_fields();

        this.title = this.options.title || this.fields_view.arch.attrs.string;

        this.enable_linking = !this.fields_view.arch.attrs.disable_linking;

        this.last_header_selected = null;
    },
    prepare_fields: function () {
        var self = this;
        _.each(this.fields, function (field, name) {
            if ((name !== 'id') && (field.store === true)) {
                if (field.type === 'integer' || field.type === 'float' || field.type === 'monetary') {
                    self.measures[name] = field;
                }
                if (_.contains(GROUPABLE_TYPES, field.type)) {
                    self.groupable_fields[name] = field;
                }
            }
        });
        this.measures.__count = {string: _t("Count"), type: "integer"};

        // add active measures to the measure list.  This is very rarely necessary, but it
        // can be useful if one is working with a functional field non stored, but in a
        // model with an overrided read_group method.  In this case, the pivot view could
        // work, and the measure should be allowed.  However, be careful if you define a
        // measure in your pivot view: non stored functional fields will probably not work
        // (their aggregate will always be 0).
        _.each(this.arch.children, function (f) {
            if (f.type === 'measure' && !(f.name in self.measures)) {
                self.measures[f.name] = f;
            }
        });
    },
    start: function (db_id) {
        this.$el.toggleClass('o_enable_linking', this.enable_linking);
        this.$field_selection = this.$('.o_field_selection');
        core.bus.on('click', this, function () {
            this.$field_selection.empty();
        });
        return this._super(db_id);
    },
    render_field_selection: function (top, left) {
        var record = this.datamodel.get(this.db_id);
        var grouped_fields = record.data.main_row.groupbys
            .concat(record.data.main_col.groupbys)
            .map(function(f) { return f.split(':')[0];});

        var fields = _.chain(this.groupable_fields)
            .pairs()
            .sortBy(function(f) { return f[1].string; })
            .map(function (f) { return [f[0], f[1], _.contains(grouped_fields, f[0])]; })
            .value();

        this.$field_selection.html(QWeb.render('PivotView.FieldSelection', {
            fields: fields
        }));

        this.$field_selection.find('ul').first()
            .css({top: top, left: left})
            .show();
    },
    /**
     * Render the buttons according to the PivotView.buttons template and
     * add listeners on it.
     * Set this.$buttons with the produced jQuery element
     * @param {jQuery} [$node] a jQuery node where the rendered buttons should be inserted
     * $node may be undefined, in which case the PivotView does nothing
     */
    render_buttons: function ($node) {
        if ($node) {
            var context = {measures: _.pairs(_.omit(this.measures, '__count'))};
            this.$buttons = $(QWeb.render('PivotView.buttons', context));
            this.$buttons.click(this.on_button_click.bind(this));
            this.$buttons.find('button').tooltip();

            this.$buttons.appendTo($node);
            this.update_buttons();
        }
    },
    update_buttons: function() {
        var self = this;
        var state = this.datamodel.get(this.db_id);

        _.each(this.measures, function(measure, name) {
            var isSelected = _.contains(state.measures, name);
            self.$buttons.find('li[data-field="' + name + '"]')
                         .toggleClass('selected', isSelected);
        });
    },
    get_context: function () {
        if (this.db_id) {
            var record = this.datamodel.get(this.db_id);
            return {
                pivot_measures: record.measures,
                pivot_column_groupby: record.data.main_col.groupbys,
                pivot_row_groupby: record.data.main_row.groupbys,
            };
        }
        return {};
    },
    on_button_click: function (event) {
        var $target = $(event.target);
        if ($target.hasClass('o_pivot_flip_button')) {
            return this.datamodel.flip(this.db_id).then(this.update_state.bind(this));
        }
        if ($target.hasClass('o_pivot_expand_button')) {
            return this.datamodel
                    .expand_all(this.db_id)
                    .then(this.update_state.bind(this));
        }
        if ($target.parents('.o_pivot_measures_list').length) {
            var parent = $target.parent();
            var field = parent.data('field');
            event.preventDefault();
            event.stopPropagation();
            return this.datamodel
                    .toggle_measure(this.db_id, field)
                    .then(this.update_state.bind(this));
        }
        if ($target.hasClass('o_pivot_download')) {
            return this.download_table();
        }
    },
    on_open_header_click: function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var header_id = $(event.target).data('id');
        this.datamodel
            .close_header(this.db_id, header_id)
            .then(this.update_state.bind(this));
    },
    on_closed_header_click: function (event) {
        var $target = $(event.target);
        var id = $target.data('id');
        var record = this.datamodel.get(this.db_id);
        var header = record.data.headers[id];
        var groupbys = header.root.groupbys;

        if (header.path.length - 1 < groupbys.length) {
            this.datamodel
                .expand_header(this.db_id, header, groupbys[header.path.length - 1])
                .then(this.update_state.bind(this));
        } else {
            this.last_header_selected = id;
            var position = $target.position();
            var top = position.top + $target.height();
            var left = position.left + event.offsetX;
            this.render_field_selection(top, left);
            event.stopPropagation();
        }
    },
    on_cell_click: function (event) {
        var $target = $(event.target);
        if ($target.hasClass('o_pivot_header_cell_closed') ||
            $target.hasClass('o_pivot_header_cell_opened') ||
            $target.hasClass('o_empty') ||
            !this.enable_linking) {
            return;
        }
        var row_id = $target.data('id');
        var col_id = $target.data('col_id');
        var record = this.datamodel.get(this.db_id);
        var row_domain = record.data.headers[row_id].domain;
        var col_domain = record.data.headers[col_id].domain;
        var context = _.omit(_.clone(record.context), 'group_by');

        function _find_view_info (views, view_type) {
            return _.find(views, function (view) {
                return view[1] === view_type;
            }) || [false, view_type];
        }
        var views = [
            _find_view_info(this.options.action.views, "list"),
            _find_view_info(this.options.action.views, "form"),
        ];

        return this.do_action({
            type: 'ir.actions.act_window',
            name: this.title,
            res_model: this.model,
            views: views,
            view_type : "list",
            view_mode : "list",
            target: 'current',
            context: context,
            domain: record.domain.concat(row_domain, col_domain),
        });
    },
    on_measure_row_click: function (event) {
        var $target = $(event.target);
        var col_id = $target.data('id');
        var measure = $target.data('measure');
        var isAscending = $target.hasClass('o_pivot_measure_row_sorted_asc');
        this.datamodel
            .sort_rows(this.db_id, col_id, measure, isAscending)
            .then(this.update_state.bind(this));
    },
    on_field_menu_selection: function (event) {
        event.preventDefault();
        var $target = $(event.target);
        if ($target.parent().hasClass('disabled')) {
            event.stopPropagation();
            return;
        }
        var field = $target.parent().data('field');
        var interval = $target.data('interval');
        var record = this.datamodel.get(this.db_id);
        var header = record.data.headers[this.last_header_selected];
        if (interval) {
            field = field + ':' + interval;
        }
        this.datamodel
            .expand_header(this.db_id, header, field)
            .then(this.update_state.bind(this));
    },
    download_table: function () {
        framework.blockUI();
        var record = this.datamodel.get(this.db_id);
        var nbr_measures = record.measures.length;
        var headers = this.renderer.compute_headers();
        var measure_row = nbr_measures > 1 ? _.last(headers) : [];
        var rows = this.renderer.compute_rows();
        var i, j, value;
        headers[0].splice(0,1);

        // process measure_row
        for (i = 0; i < measure_row.length; i++) {
            measure_row[i].measure = this.measures[measure_row[i].measure].string;
        }
        // process all rows
        for (i =0, j, value; i < rows.length; i++) {
            for (j = 0; j < rows[i].values.length; j++) {
                value = rows[i].values[j];
                rows[i].values[j] = {
                    is_bold: (i === 0) || ((record.data.main_col.width > 1) && (j >= rows[i].values.length - nbr_measures)),
                    value:  (value === undefined) ? "" : value,
                };
            }
        }
        var table = {
            headers: _.initial(headers),
            measure_row: measure_row,
            rows: rows,
            nbr_measures: nbr_measures,
            title: this.title,
        };
        if(table.measure_row.length + 1 > 256) {
            crash_manager.show_message(_t("For Excel compatibility, data cannot be exported if there are more than 256 columns.\n\nTip: try to flip axis, filter further or reduce the number of measures."));
            return;
        }
        session.get_file({
            url: '/web/pivot/export_xls',
            data: {data: JSON.stringify(table)},
            complete: framework.unblockUI,
            error: crash_manager.rpc_error.bind(crash_manager)
        });
    },
    destroy: function () {
        if (this.$buttons) {
            this.$buttons.find('button').off(); // remove jquery's tooltip() handlers
        }
        return this._super.apply(this, arguments);
    },
    hasNoContent: function(state) {
        return !state.measures.length || !state.has_data;
    },
    displayNoContentHelp: function() {
        this.$el.append(QWeb.render('PivotView.nodata'));
    },

});


view_registry.add('pivot', PivotView);

return PivotView;

});
