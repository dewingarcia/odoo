odoo.define("web_editor.context", function (require) {
    "use strict";

    return {
        get: function (context) {
            var html = document.documentElement;
            return _.extend({
                lang: (html.getAttribute('lang') || '').replace('-', '_'),
            }, context || {});
        },
    };
});

odoo.define('web_editor.base', function (require) {
"use strict";

var ajax = require('web.ajax');
var core = require('web.core');
var session = require("web.session");
var webEditorContext = require("web_editor.context");

var qweb = core.qweb;
var _t = core._t;

var data = {
    url_translations: "/web/webclient/translations",

    ready: (function () { // TODO remove and load a bundle of translated templates
        var def = $.Deferred();
        $(function () {
            _.defer(function () {
                ajax.loadXML().then(function () {
                    // We don't load translation if we are in the backend since it's already done by the webclient
                    return (session.is_frontend ? loadTranslations() : $.when()).then(function () {
                        def.resolve();
                    });
                });
            });

            // TODO should be elsewhere ?
            // fix for ie
            if ($.fn.placeholder) $('input, textarea').placeholder();
        });
        return function () { return def; };
    })(),
};

function loadTranslations() {
    function translate_node(node) {
        if(node.nodeType === 3) { // TEXT_NODE
            if(node.nodeValue.match(/\S/)) {
                var space = node.nodeValue.match(/^([\s]*)([\s\S]*?)([\s]*)$/);
                node.nodeValue = space[1] + $.trim(_t(space[2])) + space[3];
            }
        }
        else if(node.nodeType === 1 && node.hasChildNodes()) { // ELEMENT_NODE
            _.each(node.childNodes, translate_node);
        }
    }
    return ajax.jsonRpc(data.url_translations, 'call', {
        mods: ['web_editor'],
        lang: webEditorContext.get().lang,
    }).then(function (trans) {
        _t.database.set_bundle(trans);
    }).then(function () {
        var keys = _.keys(qweb.templates);
        for (var i = 0; i < keys.length; i++) {
            translate_node(qweb.templates[keys[i]]);
        }
    });
}

return data;
});
