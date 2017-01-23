odoo.define("website.lazy_template_call", function (require) {
    "use strict";

    var ajax = require('web.ajax');
    var core = require('web.core');
    var base = require('web_editor.base');

    var qweb = core.qweb;

    base.ready().then(function () {
        var ids_or_xml_ids = _.uniq($("[data-oe-call]").map(function () {return $(this).data('oe-call');}).get());
        if (ids_or_xml_ids.length) {
            ajax.jsonRpc('/website/multi_render', 'call', {
                ids_or_xml_ids: ids_or_xml_ids
            }).then(function (data) {
                for (var k in data) {
                    var $data = $(data[k]).addClass('o_block_'+k);
                    $("[data-oe-call='"+k+"']").each(function () {
                        $(this).replaceWith($data.clone());
                    });
                }
            });
        }

        if ($(".o_gallery:not(.oe_slideshow)").size()) {
            // load gallery modal template
            ajax.loadXML('/website/static/src/xml/website.gallery.xml', qweb);
        }
    });
});
