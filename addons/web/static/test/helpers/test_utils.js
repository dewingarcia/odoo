odoo.define('web.test_utils', function (require) {
"use strict";

var session = require('web.session');
var MockServer = require('web.MockServer');

// intercept an event bubbling up the widget hierarchy
// The event intercepted must be a "custom event", i.e. an event generated
// by the method 'trigger_up'.  This method intercept the event, and prevent
// any effect.
// Params:
// * widget: the target widget (any Odoo widget)
// * event_name: string, description of the event
// * fn: callback executed when the even is intercepted
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


// create a view from various parameters.  Here, a view means a javascript
// instance of a View class, such as a form view, a list view or a kanban view.
// Params:
// * params is an object with various keys:
//   - View: the class that needs to be instantiated (children of AbstractView)
//   - model: a string describing a 'virtual' model, such as 'foo'
//   - data: an object with a description of each models (fields and records)
//     required by the view
//   - arch: a string with the xml (arch) of the view to be instantiated
//   - domain: the domain that will be used in the do_search method
//   - context: the context that will be used in the do_search method
//   - group_by: the group_by that will be used in the do_search method
//
// It returns the instance of the view, properly created, with all rpcs going
// through a mock method using the data object as source, and already loaded/
// started (with a do_search).  The buttons/pager should also be created, if
// appropriate.
function createView(params) {
    var dataset = {
        model: params.model || 'foo',
        index: 0,
        ids: [params.res_id],
    };

    var Server = MockServer;
    if (params.mockRPC) {
        Server = MockServer.extend({performRpc: params.mockRPC});
    }

    var mockServer = new Server(params.data);
    var fields_view = mockServer.fieldsViewGet(params.arch, params.model);

    var view = new params.View(null, dataset, fields_view, params.view_options);
    if (params.with_modifiers) {
        _.each(params.with_modifiers, function(modifier, name) {
            fields_view.fields[name].__attrs.modifiers = JSON.stringify(modifier);
        });
    }

    view.datamodel.perform_rpc = mockServer.performRpc.bind(mockServer);

    view.__widgetRenderAndInsert(function() {}).then(function () {
        view.$el.on('click a', view, function(ev) {
            ev.preventDefault();
        });
        setTimeout(function() {
            view.destroy();
        }, 50);
        return view.do_search(params.domain || [], params.context || {}, params.group_by || []);
    }).then(function() {
        view.render_buttons($('<div>'));
    });

    return view;
}


return session.is_bound.then(function() {
    setTimeout(function() {
        // this is done with the hope that tests are
        // only started all together...
        QUnit.start();
    }, 0);
    return {
        intercept: intercept,
        createView: createView,
    };
});

});


