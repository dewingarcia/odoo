odoo.define('web.OrgChart', function (require) {
"use strict";

var ajax = require('web.ajax');
var core = require('web.core');
var form_common = require('web.form_common');

var QWeb = core.qweb;
var _t = core._t;


var FieldOrgChart = form_common.AbstractField.extend({
    template: "hr_org_chart_widget",

    init: function () {
        this._super.apply(this, arguments);
        this.org_chart_data = {};
    },

    render_value: function () {
        var self = this;

        this.get_org_chart_data().then(function () {
            self.$el.html(QWeb.render("OrgChartDetail", {widget: self, data: self.org_chart_data}));
           }
        );

        // NOTE: setTimeout ... Super ugly workaround to wait that the element is rendered
        setTimeout(function () {
            // Popovers
            self.$el.find('[data-toggle="popover"]').each(function () {
                var $el = $(this),
                    $table = $('<table/>').addClass('table table-condensed'),
                    pic = '<span style="background-image:url('+ $el.data('pic-url') +'")/>',
                    title = pic + '<b>' + $el.data('name') + '</b>';

                if($el.hasClass('o_org_chart_add_link')){
                    title = title + '<a href="' + $el.data('usr-url') +'" class="pull-right"><i class="fa fa-external-link"></i></a>';
                }

                // NOTE: Table's links should point to a kanban view filtered accordding to the link.
                $table.append('<thead><td class="text-right">' + $el.data('dir-subs') + '</td><td><a href="#"><b>' + _t('Direct subordinates') + '</b></a></td></thead>');
                if (parseInt($el.data('ind-subs')) > 0 ) {
                    $table.append($('<tbody/>'))
                          .append('<tr><td class="text-right">' + $el.data('ind-subs') + '</td><td><a href="#">' + _t('Indirect subordinates') + '</a></td></tr>')
                          .append('<tr><td class="text-right">' + (parseInt($el.data('ind-subs')) + parseInt($el.data('dir-subs'))) + '</td><td><a href="#">'+ _t('Total') +'</a></td></tr>');
                }

                $el.popover({
                    html: true,
                    title: title,
                    container: 'body',
                    placement: 'left',
                    trigger: 'focus',
                    content: $table,
                    template: '<div class="popover o_org_chart_popup" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
                });
            });
        },1000);

        this._super();
    },

    get_org_chart_data: function () {
        var self = this;
        return ajax.jsonRpc('/hr/get_org_chart', 'call', {
            employee_id: this.view.datarecord.id,
        }).then(function (data) {
            self.org_chart_data = data;
        });
    },
});

core.form_widget_registry.add('hr_org_chart', FieldOrgChart);

return FieldOrgChart;

});
