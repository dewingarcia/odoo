odoo.define('website.website', function (require) {
    "use strict";

    require("web.dom_ready");
    var ajax = require('web.ajax');
    var Dialog = require("web.Dialog");
    var base = require('web_editor.base');
    var webEditorContext = require("web_editor.context");
    var wUtils = require("website.utils");
    require("website.content.zoomodoo");

    base.url_translations = '/website/translations';

    Dialog.include({ // FIXME should be elsewhere
        init: function () {
            this._super.apply(this, arguments);
            this.$modal.addClass("o_website_modal");
        },
    });

    // Set the browser into the dom for css selectors
    var browser;
    if ($.browser.webkit) browser = "webkit";
    else if ($.browser.safari) browser = "safari";
    else if ($.browser.opera) browser = "opera";
    else if ($.browser.msie || ($.browser.mozilla && +$.browser.version.replace(/^([0-9]+\.[0-9]+).*/, '\$1') < 20)) browser = "msie";
    else if ($.browser.mozilla) browser = "mozilla";
    browser += ","+$.browser.version;
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(window.navigator.userAgent.toLowerCase())) browser += ",mobile";
    document.documentElement.setAttribute('data-browser', browser);

    // Helpers
    var get_context = webEditorContext.get;
    webEditorContext.get = function (context) {
        var html = document.documentElement;
        return _.extend({
            website_id: html.getAttribute('data-website-id')|0
        }, get_context(context), context);
    };

    // Publishing stuff
    $(document).on('click', '.js_publish_management .js_publish_btn', function (e) {
        e.preventDefault();

        var $data = $(this).parents(".js_publish_management:first");
        ajax.jsonRpc($data.data('controller') || '/website/publish', 'call', {'id': +$data.data('id'), 'object': $data.data('object')})
            .then(function (result) {
                $data.toggleClass("css_unpublished css_published");
                $data.parents("[data-publish]").attr("data-publish", +result ? 'on' : 'off');
            }).fail(function (err, data) {
                wUtils.error(data.data ? data.data.arguments[0] : "", data.data ? data.data.arguments[1] : data.statusText, '/web#return_label=Website&model='+$data.data('object')+'&id='+$data.data('id'));
            });
    });

    // Language selector
    if (!$('.js_change_lang').length) {
        // in case template is not up to date...
        var links = $('ul.js_language_selector li a:not([data-oe-id])');
        var m = $(_.min(links, function (l) { return $(l).attr('href').length; })).attr('href');
        links.each(function () {
            var t = $(this).attr('href');
            var l = (t === m) ? "default" : t.split('/')[1];
            $(this).data('lang', l).addClass('js_change_lang');
        });
    }
    $(document).on('click', '.js_change_lang', function (e) {
        e.preventDefault();

        var self = $(this);
        // retrieve the hash before the redirect
        var redirect = {
            lang: self.data('lang'),
            url: encodeURIComponent(self.attr('href').replace(/[&?]edit_translations[^&?]+/, '')),
            hash: encodeURIComponent(window.location.hash)
        };
        window.location.href = _.str.sprintf("/website/lang/%(lang)s?r=%(url)s%(hash)s", redirect);
    });

    $('.js_website_submit_form').on('submit', function () {
        var $buttons = $(this).find('button[type="submit"], a.a-submit');
        _.each($buttons, function (btn) {
            $(btn).attr('data-loading-text', '<i class="fa fa-spinner fa-spin"></i> ' + $(btn).text()).button('loading');
        });
    });

    _.defer(function () {
        if (window.location.hash.indexOf("scrollTop=") > -1) {
            window.document.body.scrollTop = +window.location.hash.match(/scrollTop=([0-9]+)/)[1];
        }
    });

    // display image thumbnail
    $(".o_image[data-mimetype^='image']").each(function () {
        var $img = $(this);
        if (/gif|jpe|jpg|png/.test($img.data('mimetype')) && $img.data('src')) {
            $img.css('background-image', "url('" + $img.data('src') + "')");
        }
    });

    // enable magnify on zommable img
    $('.zoomable img[data-zoom]').zoomOdoo();
});
