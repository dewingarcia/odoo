odoo.define("web.ModelFieldSelector", function (require) {
"use strict";

var core = require("web.core");
var Widget = require("web.Widget");

var _t = core._t;

/**
 * Field Selector Cache - TODO Should be improved to use external cache ?
 * - Stores fields per model used in field selector
 * @see ModelFieldSelector._getModelFieldsFromCache
 */
var modelFieldsCache = {
    cache: {},
    cacheDefs: {},
};

/**
 * The ModelFieldSelector widget can be used to display/select a particular
 * field chain from a given model.
 */
var ModelFieldSelector = Widget.extend({
    template: "ModelFieldSelector",
    events: {},
    editionEvents: {
        // Handle popover opening and closing
        "focusin": "_onFocusIn",
        "focusout": "_onFocusOut",
        "click .o_field_selector_close": "_onCloseClick",

        // Handle popover field navigation
        "click .o_field_selector_prev_page": "_onPrevPageClick",
        "click .o_field_selector_next_page": "_onNextPageClick",
        "click li.o_field_selector_select_button": "_onLastFieldClick",

        // Handle a direct change in the debug input
        "change input": "_onInputChange",

        // Handle keyboard and mouse navigation to build the field chain
        "mouseover li.o_field_selector_item": "_onItemHover",
        "keydown": "_onKeydown",
    },
    /**
     * @constructor
     * The ModelFieldSelector requires a model and a field chain to work with.
     *
     * @param {string} model - the model name (e.g. "res.partner")
     * @param {string[]} chain - list of the initial field chain parts
     * @param {Object} [options] - some key-value options
     * @param {boolean} [options.readonly=true] - true if should be readonly
     * @param {Object} [options.filters]
     *                 - some key-value options to filter the fetched fields
     * @param {boolean} [options.filters.searchable=true]
     *                  - true if only the searchable fields have to be used
     * @param {Object[]} [options.fields=null]
     *                   - the list of fields info to use when no relation has
     *                   been followed (null indicates the widget has to request
     *                   the fields itself)
     * @param {boolean} [options.followRelations=true]
     *                  - true if can follow relation when building the chain
     * @param {boolean} [options.debugMode=false]
     *                  - true if the widget is in debug mode, false otherwise
     */
    init: function (parent, model, chain, options) {
        this._super.apply(this, arguments);

        this.model = model;
        this.chain = chain;
        this.options = _.extend({
            readonly: true,
            filters: {},
            fields: null,
            followRelations: true,
            debugMode: false,
        }, options || {});
        this.options.filters = _.extend({
            searchable: true,
        }, this.options.filters);

        this.pages = [];
        this.dirty = false;

        if (!this.options.readonly) {
            _.extend(this.events, this.editionEvents);
        }
    },
    /**
     * @see Widget.willStart()
     * @return {Deferred}
     */
    willStart: function () {
        return $.when(
            this._super.apply(this, arguments),
            this._prefill()
        );
    },
    /**
     * @see Widget.start
     * @return {Deferred}
     */
    start: function () {
        this.$value = this.$(".o_field_selector_value");
        this.$popover = this.$(".o_field_selector_popover");
        this.$input = this.$popover.find("input");
        this.$valid = this.$(".o_field_selector_warning");

        this._render();

        return this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * The isValid method indicates if the field chain is valid. If the field
     * chain has not been processed yet (the widget is not ready), this method
     * will return undefined.
     *
     * @return {boolean}
     */
    isValid: function () {
        return this.valid;
    },
    /**
     * The getSelectedField method returns the field information selected by the
     * field chain.
     *
     * @return {Object}
     */
    getSelectedField: function () {
        return _.findWhere(this.pages[this.chain.length - 1], {name: _.last(this.chain)});
    },
    /**
     * The setChain method saves a new field chain (array) and displays.
     *
     * @param {string[]} chain - the new field chain
     */
    setChain: function (chain) {
        if (_.isEqual(chain, this.chain)) {
            return $.when();
        }

        this.chain = chain;
        return this._prefill().then(this._render.bind(this));
    },
    /**
     * The showPopover method shows the popover to select the field chain.
     * This assumes that the popover has finished its rendering (fully rendered
     * widget or resolved deferred of @see setChain).
     * (if already open, does nothing)
     */
    showPopover: function () {
        if (this._isOpen) return;

        this._isOpen = true;
        this.$popover.removeClass("hidden");
    },
    /**
     * The hidePopover method closes the popover and mark the field as selected.
     * If the field chain changed, it notifies its parents.
     * (if not open, does nothing)
     */
    hidePopover: function () {
        if (!this._isOpen) return;

        this._isOpen = false;
        this.$popover.addClass("hidden");

        if (this.dirty) {
            this.dirty = false;
            this.pages = this.pages.slice(0, this.chain.length);
            this.trigger_up("field_chain_changed", {chain: this.chain});
        }
    },
    /**
     * The goToPrevPage method removes the last page, adapts the field chain and
     * displays the new last page.
     */
    goToPrevPage: function () {
        if (this.pages.length <= 0) return;

        this._validate(true);
        this._removeChainNode();
        if (this.pages.length > 1) {
            this.pages.pop();
        }
        this._render();
    },
    /**
     * The goToNextPage method adds a new page to the popover following the
     * given field relation and adapts the chain node according to this given
     * field.
     *
     * @param {Object} field - the field to add to the chain node
     */
    goToNextPage: function (field) {
        if (!_.isEqual(this._getLastPageField(field.name), field)) return;

        this._validate(true);
        this._addChainNode(field.name);
        this._pushPageData(field.relation).then(this._render.bind(this));
    },
    /**
     * The selectField method selects the given field and adapts the chain node
     * according to it. It also closes the popover and thus notifies the parents
     * about the change.
     *
     * @param {Object} field - the field to select
     */
    selectField: function (field) {
        if (!_.isEqual(this._getLastPageField(field.name), field)) return;

        this._validate(true);
        this._addChainNode(field.name);
        this._render();
        this.hidePopover();
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * The @private _prefill method prepares the popover by filling its pages
     * according to the current field chain.
     *
     * @return {Deferred} resolved once the whole field chain has been processed
     */
    _prefill: function () {
        this.pages = [];
        return this._pushPageData(this.model).then((function () {
            this._validate(true);
            return (this.chain.length ? processChain.call(this, this.chain.slice().reverse()) : $.when());
        }).bind(this));

        function processChain(chain) {
            var field = this._getLastPageField(chain.pop());
            if (field && field.relation && chain.length > 0) { // Fetch next chain node if any and possible
                return this._pushPageData(field.relation).then(processChain.bind(this, chain));
            } else if (field && chain.length === 0) { // Last node fetched
                return $.when();
            } else { // Wrong node chain
                this._validate(false);
            }
            return $.when();
        }
    },
    /**
     * The @private _pushPageData method gets the field of a particular model
     * and adds them for the new last popover page.
     *
     * @param {string} model - the model name whose fields have to be fetched
     *
     * @return {Deferred} resolved once the fields have been added
     */
    _pushPageData: function (model) {
        var def;
        if (this.model === model && this.options.fields) {
            def = $.when(sortFields(this.options.fields));
        } else {
            def = this._getModelFieldsFromCache(model, this.options.filters);
        }
        return def.then((function (fields) {
            this.pages.push(fields);
        }).bind(this));
    },
    /**
     * The @private _validate method toggles the valid status of the widget and
     * display the error message if it is not valid.
     *
     * @param {boolean} valid - true if the widget is valid, false otherwise
     */
    _validate: function (valid) {
        this.valid = !!valid;

        if (!this.valid) {
            this.do_warn(
                _t("Invalid field chain"),
                _t("The field chain is not valid. Did you maybe used a non-existing field name or followed a non-relational field?")
            );
        }
    },
    /**
     * The @private _render method update the rendering of the value (the serie
     * of tags separated by arrows). It also adapt the content of the popover.
     */
    _render: function () {
        // Render the chain value
        this.$value.html(core.qweb.render(this.template + ".value", {
            chain: this.chain,
            pages: this.pages,
        }));

        // Toggle the warning message
        this.$valid.toggleClass("hidden", !!this.isValid());

        // Adapt the popover content
        var page = _.last(this.pages);
        var title = "";
        if (this.pages.length > 1) {
            var prevField = _.findWhere(this.pages[this.pages.length - 2], {
                name: (this.chain.length === this.pages.length) ? this.chain[this.chain.length - 2] : _.last(this.chain),
            });
            if (prevField) title = prevField.string;
        }
        this.$(".o_field_selector_popover_header .o_field_selector_title").text(title);
        this.$(".o_field_selector_page").replaceWith(core.qweb.render(this.template + ".page", {
            lines: page,
            followRelations: this.options.followRelations,
            debug: this.options.debugMode,
        }));
        this.$input.val(this.chain.join("."));
    },
    /**
     * The @private _addChainNode method adds a field name to the current field
     * chain and marks it as dirty.
     *
     * @param {string} fieldName - the new field name to add at the end of the
     *                           current field chain
     */
    _addChainNode: function (fieldName) {
        this.dirty = true;
        this.chain = this.chain.slice(0, this.pages.length-1);
        this.chain.push(fieldName);
    },
    /**
     * The @private _removeChainNode method removes the last field name at the
     * end of the current field chain and marks it as dirty.
     */
    _removeChainNode: function () {
        this.dirty = true;
        this.chain = this.chain.slice(0, this.pages.length-1);
        this.chain.pop();
    },
    /**
     * The @private _getLastPageField searches a field in the last page by its
     * name.
     *
     * @param {string} name - the name of the field to find
     *
     * @return {Object} the field data found in the last popover page thanks
     *                  to its name
     /*/
    _getLastPageField: function (name) {
        return _.findWhere(_.last(this.pages), {
            name: name,
        });
    },
    /**
     * The _getFieldsFromCache method searches the cache for the given model
     * fields, according to the given filter. If the cache does not know about
     * the model, the cache is updated.
     *
     * @param {string} model
     * @param {Object} filters @see ModelFieldSelector.init.options.filters
     *
     * @returns {Object[]} a list of the model fields info, sorted by field
     *                     non-technical name
     */
    _getModelFieldsFromCache: function (model, filters) {
        var def = modelFieldsCache.cacheDefs[model];
        if (!def) {
            def = modelFieldsCache.cacheDefs[model] = this._rpc(model, "fields_get")
                .args([
                    false,
                    ["store", "searchable", "type", "string", "relation", "selection", "related"]])
                .exec()
                .then((function (fields) {
                    modelFieldsCache.cache[model] = sortFields(fields);
                }).bind(this));
        }
        return def.then((function () {
            return _.filter(modelFieldsCache.cache[model], function (f) {
                return !filters.searchable || f.searchable;
            });
        }).bind(this));
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when the widget is focused -> open the popover
     */
    _onFocusIn: function () {
        clearTimeout(this._hidePopoverTimeout);
        this.showPopover();
    },
    /**
     * Called when the widget is blurred -> close the popover
     */
    _onFocusOut: function () {
        this._hidePopoverTimeout = _.defer(this.hidePopover.bind(this));
    },
    /**
     * Called when the popover "cross" icon is clicked -> close the popover
     */
    _onCloseClick: function () {
        this.hidePopover();
    },
    /**
     * Called when the popover "previous" icon is clicked -> remove last chain
     * node
     */
    _onPrevPageClick: function () {
        this.goToPrevPage();
    },
    /**
     * Called when a popover relation field button is clicked -> add it to chain
     *
     * @param {Event} e
     */
    _onNextPageClick: function (e) {
        e.stopPropagation();
        this.goToNextPage(this._getLastPageField($(e.currentTarget).data("name")));
    },
    /**
     * Called when a popover non-relation field button is clicked -> add it to
     * chain and close the popover
     *
     * @param {Event} e
     */
    _onLastFieldClick: function (e) {
        this.selectField(this._getLastPageField($(e.currentTarget).data("name")));
    },
    /**
     * Called when the debug input value is changed -> adapt the chain
     */
    _onInputChange: function () {
        var userChainStr = this.$input.val();
        var userChain = userChainStr.split(".");
        if (!this.options.followRelations && userChain.length > 1) {
            this.do_warn(_t("Relation not allowed"), _t("You cannot follow relations for this field chain construction"));
            userChain = [userChain[0]];
        }
        this.setChain(userChain).then((function () {
            this.trigger_up("field_chain_changed", {chain: this.chain});
        }).bind(this));
    },
    /**
     * Called when a popover field button item is hovered -> toggle its "active"
     * status
     *
     * @param {Event} e
     */
    _onItemHover: function (e) {
        this.$("li.o_field_selector_item").removeClass("active");
        $(e.currentTarget).addClass("active");
    },
    /**
     * Called when the user use keyboard when the widget is focused -> handle
     * field keyboard navigation
     *
     * @param {Event} e
     */
    _onKeydown: function (e) {
        if (!this.$popover.is(":visible")) return;
        var inputHasFocus = this.$input.is(":focus");

        switch (e.which) {
            case $.ui.keyCode.UP:
            case $.ui.keyCode.DOWN:
                e.preventDefault();
                var $active = this.$("li.o_field_selector_item.active");
                var $to = $active[e.which === $.ui.keyCode.DOWN ? "next" : "prev"](".o_field_selector_item");
                if ($to.length) {
                    $active.removeClass("active");
                    $to.addClass("active");
                    this.$popover.focus();

                    var $page = $to.closest(".o_field_selector_page");
                    var full_height = $page.height();
                    var el_position = $to.position().top;
                    var el_height = $to.outerHeight();
                    var current_scroll = $page.scrollTop();
                    if (el_position < 0) {
                        $page.scrollTop(current_scroll - el_height);
                    } else if (full_height < el_position + el_height) {
                        $page.scrollTop(current_scroll + el_height);
                    }
                }
                break;
            case $.ui.keyCode.RIGHT:
                if (inputHasFocus) break;
                e.preventDefault();
                var name = this.$("li.o_field_selector_item.active").data("name");
                if (name) {
                    var field = this._getLastPageField(name);
                    if (field.relation) {
                        this.goToNextPage(field);
                    }
                }
                break;
            case $.ui.keyCode.LEFT:
                if (inputHasFocus) break;
                e.preventDefault();
                this.goToPrevPage();
                break;
            case $.ui.keyCode.ESCAPE:
                e.stopPropagation();
                this.hidePopover();
                break;
            case $.ui.keyCode.ENTER:
                if (inputHasFocus) break;
                e.preventDefault();
                this.selectField(this._getLastPageField(this.$("li.o_field_selector_item.active").data("name")));
                break;
        }
    }
});

return ModelFieldSelector;

/**
 * The sortFields function allow to transform a mapping field name -> field info
 * in an array of the field infos, sorted by field user name ("string" value).
 * The field infos in the final array contain an additional key "name" with the
 * field name.
 *
 * @param {Object} fields - the mapping field name -> field info
 *
 * @return {Object[]} the field infos sorted by field "string" (field infos
 *                    contain an additional key "name" with the field name)
 */
function sortFields(fields) {
    return _.chain(fields)
        .pairs()
        .sortBy(function (p) { return p[1].string; })
        .map(function (p) { return _.extend({name: p[0]}, p[1]); })
        .value();
}
});
