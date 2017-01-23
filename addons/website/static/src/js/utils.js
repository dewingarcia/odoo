odoo.define("website.utils", function (require) {
    "use strict";

    var Dialog = require("web.Dialog");
    var core = require('web.core');

    var qweb = core.qweb;

    var prompt = function (options, _qweb) {
        /**
         * A bootstrapped version of prompt() albeit asynchronous
         * This was built to quickly prompt the user with a single field.
         * For anything more complex, please use editor.Dialog class
         *
         * Usage Ex:
         *
         * website.prompt("What... is your quest ?").then(function (answer) {
         *     arthur.reply(answer || "To seek the Holy Grail.");
         * });
         *
         * website.prompt({
         *     select: "Please choose your destiny",
         *     init: function () {
         *         return [ [0, "Sub-Zero"], [1, "Robo-Ky"] ];
         *     }
         * }).then(function (answer) {
         *     mame_station.loadCharacter(answer);
         * });
         *
         * @param {Object|String} options A set of options used to configure the prompt or the text field name if string
         * @param {String} [options.window_title=''] title of the prompt modal
         * @param {String} [options.input] tell the modal to use an input text field, the given value will be the field title
         * @param {String} [options.textarea] tell the modal to use a textarea field, the given value will be the field title
         * @param {String} [options.select] tell the modal to use a select box, the given value will be the field title
         * @param {Object} [options.default=''] default value of the field
         * @param {Function} [options.init] optional function that takes the `field` (enhanced with a fillWith() method) and the `dialog` as parameters [can return a deferred]
         */
        if (typeof options === 'string') {
            options = {
                text: options
            };
        }
        if (_.isUndefined(_qweb)) {
            _qweb = 'website.prompt';
        }
        options = _.extend({
            window_title: '',
            field_name: '',
            'default': '', // dict notation for IE<9
            init: function () {},
        }, options || {});

        var type = _.intersection(Object.keys(options), ['input', 'textarea', 'select']);
        type = type.length ? type[0] : 'input';
        options.field_type = type;
        options.field_name = options.field_name || options[type];

        var def = $.Deferred();
        var dialog = $(qweb.render(_qweb, options)).appendTo("body");
        options.$dialog = dialog;
        var field = dialog.find(options.field_type).first();
        field.val(options['default']); // dict notation for IE<9
        field.fillWith = function (data) {
            if (field.is('select')) {
                var select = field[0];
                data.forEach(function (item) {
                    select.options[select.options.length] = new window.Option(item[1], item[0]);
                });
            } else {
                field.val(data);
            }
        };
        var init = options.init(field, dialog);
        $.when(init).then(function (fill) {
            if (fill) {
                field.fillWith(fill);
            }
            dialog.modal('show');
            field.focus();
            dialog.on('click', '.btn-primary', function () {
                    var backdrop = $('.modal-backdrop');
                def.resolve(field.val(), field, dialog);
                dialog.modal('hide').remove();
                    backdrop.remove();
            });
        });
        dialog.on('hidden.bs.modal', function () {
                var backdrop = $('.modal-backdrop');
            def.reject();
            dialog.remove();
                backdrop.remove();
        });
        if (field.is('input[type="text"], select')) {
            field.keypress(function (e) {
                if (e.which === 13) {
                    e.preventDefault();
                    dialog.find('.btn-primary').trigger('click');
                }
            });
        }
        return def;
    };

    var error = function (title, message, url) {
        return new Dialog(null, {
            title: title || "",
            $content: $(qweb.render('website.error_dialog', {
                message: message || "",
                backend_url: url,
            })),
        }).open();
    };

    function _add_input(form, name, value) {
        var param = document.createElement('input');
        param.setAttribute('type', 'hidden');
        param.setAttribute('name', name);
        param.setAttribute('value', value);
        form.appendChild(param);
    }
    var form = function (url, method, params) {
        var form = document.createElement('form');
        form.setAttribute('action', url);
        form.setAttribute('method', method);

        if (core.csrf_token) {
            _add_input(form, 'csrf_token', core.csrf_token);
        }
        _.each(params, function (v, k) {
            _add_input(form, k, v);
        });
        document.body.appendChild(form);
        form.submit();
    };

    return {
        prompt: prompt,
        error: error,
        form: form,
    };
});
