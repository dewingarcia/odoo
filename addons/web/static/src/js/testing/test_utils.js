odoo.define('web.test_utils', function (require) {
"use strict";

var test_model = require('web.test_model');

// function parse_arch(str) {
//     var doc = $.parseXML(str).documentElement;
//     return utils.xml_to_json(doc, true);
// }

function intercept(widget, event_name, fn) {
    var _trigger_up = widget._trigger_up.bind(widget);
    widget._trigger_up = function(event) {
        if (event.name === event_name) {
            fn(event);
        } else {
            _trigger_up(event);
        }
    };
}


function render_view(params) {
    var dataset = {
        model: params.model || 'foo',
        index: 0,
        ids: [params.res_id],
    };

    var fields_view = test_model.get_fields_view(params.arch);
    var view = new params.View(null, dataset, fields_view, params.view_options);
    if (params.with_modifiers) {
        _.each(params.with_modifiers, function(modifier, name) {
            fields_view.fields[name].__attrs.modifiers = JSON.stringify(modifier);
        });
    }
    view.datamodel = test_model.get_model(fields_view);
    view.__widgetRenderAndInsert(function() {}).then(function () {
        view.$el.on('click a', view, function(ev) {
            ev.preventDefault();
        });
        setTimeout(function() {
            view.destroy();
        }, 100);
        return view.do_search(params.domain || [], params.context || {}, params.group_by || []);
    }).then(function() {
        view.render_buttons($('<div>'));
    });

    return view;
}


return {
    intercept: intercept,
    render_view: render_view,
};

});
