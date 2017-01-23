odoo.define("website.snippets.options", function (require) {
    "use strict";

    var ajax = require("web.ajax");
    var core = require("web.core");
    var Dialog = require("web.Dialog");
    var Model = require("web.Model");
    var editor = require("web_editor.editor");
    var widget = require("web_editor.widget");
    var animation = require("website.content.snippets.animation");
    var options = require("web_editor.snippets.options");
    var snippet_editor = require("web_editor.snippet.editor");

    var _t = core._t;
    var qweb = core.qweb;

    ajax.loadXML("/website/static/src/xml/website.gallery.xml", qweb);

    options.registry.menu_data = options.Class.extend({
        start: function () {
            this._super.apply(this, arguments);
            this.link = this.$target.attr("href");
        },

        on_focus: function () {
            this._super.apply(this, arguments);

            (new Dialog(this, {
                title: _t("Confirmation"),
                $content: $(core.qweb.render("website.leaving_current_page_edition")),
                buttons: [
                    {text: _t("Go to Link"), classes: "btn-primary", click: save_editor_then_go_to.bind(null, this.link)},
                    {text: _t("Edit the menu"), classes: "btn-primary", click: function () {
                        this.trigger_up("edit_navbar_menu", {
                            args: [
                                function () {
                                    return editor.editor_bar.save_without_reload();
                                },
                            ],
                            then: (function () {
                                this.close();
                            }).bind(this),
                        });
                    }},
                    {text: _t("Stay on this page"), close: true}
                ]
            })).open();

            function save_editor_then_go_to(url) {
                editor.editor_bar.save_without_reload().then(function () {
                    window.location.href = url;
                });
            }
        },
    });

    options.registry.company_data = options.Class.extend({
        start: function () {
            this._super.apply(this, arguments);

            var proto = options.registry.company_data.prototype;

            if (proto.__link_deferred === undefined) {
                proto.__link_deferred = $.Deferred();
                return ajax.jsonRpc("/web/session/get_session_info", "call").then(function (session) {
                    return (new Model("res.users")).get_func("read")(session.uid, ["company_id"]).then(function (res) {
                        proto.__link_deferred.resolve(
                            "/web#action=base.action_res_company_form&view_type=form&id=" + (res && res[0] && res[0].company_id[0] || 1)
                        );
                    });
                });
            }
        },

        on_focus: function () {
            this._super.apply(this, arguments);

            var proto = options.registry.company_data.prototype;

            Dialog.confirm(null, _t("Do you want to edit the company data ?"), {
                confirm_callback: function () {
                    editor.editor_bar.save_without_reload().then(function () {
                        proto.__link_deferred.then(function (link) {
                            window.location.href = link;
                        });
                    });
                },
            });
        },
    });

    options.registry.slider = options.Class.extend({
        drop_and_build_snippet: function () {
            this.id = "myCarousel" + new Date().getTime();
            this.$target.attr("id", this.id);
            this.$target.find("[data-slide]").attr("data-cke-saved-href", "#" + this.id);
            this.$target.find("[data-target]").attr("data-target", "#" + this.id);
            this.rebind_event();
        },
        on_clone: function ($clone) {
            var id = "myCarousel" + new Date().getTime();
            $clone.attr("id", id);
            $clone.find("[data-slide]").attr("href", "#" + id);
            $clone.find("[data-slide-to]").attr("data-target", "#" + id);
        },
        // rebind event to active carousel on edit mode
        rebind_event: function () {
            var self = this;
            this.$target.find('.carousel-indicators [data-slide-to]').off('click').on('click', function () {
                self.$target.carousel(+$(this).data('slide-to')); });
        },
        clean_for_save: function () {
            this._super();
            this.$target.find(".item").removeClass("next prev left right active")
                .first().addClass("active");
            this.$target.find('.carousel-indicators').find('li').removeClass('active')
                .first().addClass("active");
        },
        start : function () {
            this._super.apply(this, arguments);
            this.$target.carousel({interval: false});
            this.id = this.$target.attr("id");
            this.$inner = this.$target.find('.carousel-inner');
            this.$indicators = this.$target.find('.carousel-indicators');
            this.$target.carousel('pause');
            this.rebind_event();
        },
        add_slide: function (type) {
            if(type !== "click") return;

            var self = this;
            var cycle = this.$inner.find('.item').length;
            var $active = this.$inner.find('.item.active, .item.prev, .item.next').first();
            var index = $active.index();
            this.$target.find('.carousel-control, .carousel-indicators').removeClass("hidden");
            this.$indicators.append('<li data-target="#' + this.id + '" data-slide-to="' + cycle + '"></li>');

            // clone the best candidate from template to use new features
            var $snippets = this.buildingBlock.$snippets;
            //since saas-6, all snippets must start by s_
            var selection = this.$target.closest('[class*="s_"');
            if (_.isUndefined(selection)) {
                var point = 0;
                var className = _.compact(this.$target.attr("class").split(" "));
                $snippets.find('.oe_snippet_body').each(function () {
                    var len = _.intersection(_.compact(this.className.split(" ")), className).length;
                    if (len > point) {
                        point = len;
                        selection = this;
                    }
                });
            }
            else {
                var s_class = selection.attr('class').split(' ').filter(function (o) { return _.str.startsWith(o, "s_"); })[0];
                selection = $snippets.find("." + s_class);
            }
            var $clone = $(selection).find('.item:first').clone();

            // insert
            $clone.removeClass('active').insertAfter($active);
            setTimeout(function () {
                self.$target.carousel().carousel(++index);
                self.rebind_event();
            },0);
            return $clone;
        },
        remove_slide: function (type) {
            if (type !== "click" || this.remove_process) return;
            var self = this;

            var $items = this.$inner.find('.item');
            var cycle = $items.length - 1;
            var $active = $items.filter('.active');
            var index = $active.index();

            if (cycle > 0) {
                this.remove_process = true;
                this.$target.on('slid.bs.carousel.slide_removal', function (event) {
                    $active.remove();
                    self.$indicators.find("li:last").remove();
                    self.$target.off('slid.bs.carousel.slide_removal');
                    self.rebind_event();
                    self.remove_process = false;
                    if (cycle === 1) {
                        self.$target.find('.carousel-control, .carousel-indicators').addClass("hidden");
                    }
                });
                _.defer(function () {
                    self.$target.carousel(index > 0 ? --index : cycle);
                });
            }
        },
        interval : function (type, value) {
            this.$target.attr("data-interval", value);
        },
        set_active: function () {
            this.$el.find('li[data-interval]').removeClass("active")
                .filter('li[data-interval='+this.$target.attr("data-interval")+']').addClass("active");
        },
    });

    options.registry.carousel = options.registry.slider.extend({
        getSize: function () {
            this.grid = this._super();
            this.grid.size = 8;
            return this.grid;
        },
        clean_for_save: function () {
            this._super();
            this.$target.removeClass('oe_img_bg ' + this._class).css("background-image", "");
        },
        load_style_options : function () {
            this._super();
            $(".snippet-option-size li[data-value='']").remove();
        },
        start : function () {
            var self = this;
            this._super.apply(this, arguments);

            // set background and prepare to clean for save
            this.$target.on('slid.bs.carousel', function () {
                    self.editor.styles.background_position.$target = self.editor.styles.background.$target;
                    self.editor.styles.background_position.set_active();
                    self.editor.styles.background.$target.trigger("snippet-option-change", [self.editor.styles.background]);
                self.$target.carousel("pause");
                if (!self.editor) return;

                _.each(["background", "background_position", "colorpicker"], function (opt_name) {
                    var s_option = self.editor.styles[opt_name];
                    if (!s_option) return;

                    s_option.$target = self.$target.find(".item.active");
                    s_option.set_active();
                    s_option.$target.trigger("snippet-option-change", [s_option]);
                });
            });
            this.$target.trigger('slid.bs.carousel');
        },
        // rebind event to active carousel on edit mode
        rebind_event: function () {
            var self = this;
            this.$target.find('.carousel-control').off('click').on('click', function () {
                self.$target.carousel($(this).data('slide'));
            });
            this._super.apply(this, arguments);

            /* Fix: backward compatibility saas-3 */
            this.$target.find('.item.text_image, .item.image_text, .item.text_only').find('.container > .carousel-caption > div, .container > img.carousel-image').attr('contentEditable', 'true');
        },
    });

    options.registry["margin-x"] = options.registry.marginAndResize.extend({
        preventChildPropagation: true,

        getSize: function () {
            this.grid = this._super();
            var width = this.$target.parents(".row:first").first().outerWidth();

            var grid = [1,2,3,4,5,6,7,8,9,10,11,12];
            this.grid.e = [_.map(grid, function (v) {return 'col-md-'+v;}), _.map(grid, function (v) {return width/12*v;})];

            grid = [-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11];
            this.grid.w = [_.map(grid, function (v) {return 'col-md-offset-'+v;}), _.map(grid, function (v) {return width/12*v;}), 12];

            return this.grid;
        },
        on_clone: function ($clone) {
            var _class = $clone.attr("class").replace(/\s*(col-lg-offset-|col-md-offset-)([0-9-]+)/g, '');
            $clone.attr("class", _class);
            return false;
        },
        on_resize: function (compass, beginClass, current) {
            if (compass === 'w') {
                // don't change the right border position when we change the offset (replace col size)
                var beginCol = Number(beginClass.match(/col-md-([0-9]+)|$/)[1] || 0);
                var beginOffset = Number(beginClass.match(/col-md-offset-([0-9-]+)|$/)[1] || beginClass.match(/col-lg-offset-([0-9-]+)|$/)[1] || 0);
                var offset = Number(this.grid.w[0][current].match(/col-md-offset-([0-9-]+)|$/)[1] || 0);
                if (offset < 0) {
                    offset = 0;
                }
                var colSize = beginCol - (offset - beginOffset);
                if (colSize <= 0) {
                    colSize = 1;
                    offset = beginOffset + beginCol - 1;
                }
                this.$target.attr("class",this.$target.attr("class").replace(/\s*(col-lg-offset-|col-md-offset-|col-md-)([0-9-]+)/g, ''));

                this.$target.addClass('col-md-' + (colSize > 12 ? 12 : colSize));
                if (offset > 0) {
                    this.$target.addClass('col-md-offset-' + offset);
                }
            }
            this._super(compass, beginClass, current);
        },
    });

    options.registry.parallax = options.Class.extend({
        getSize: function () {
            this.grid = this._super.apply(this, arguments);
            this.grid.size = 8;
            return this.grid;
        },
        start: function () {
            this._super.apply(this, arguments);
            if (!this.$target.data("snippet-view")) {
                this.$target.data("snippet-view", new animation.registry.parallax(this.$target));
            }
            this._refresh_callback = this._refresh.bind(this);
            this._toggle_refresh_callback(true);
        },
        on_focus: function () {
            this._super.apply(this, arguments);
            this._update_target_to_bg();
        },
        on_resize: function () {
            this._super.apply(this, arguments);
            this._refresh();
        },
        scroll: function (type, value) {
            this.$target.attr("data-scroll-background-ratio", value);
            this._refresh();
        },
        set_active: function () {
            this._super.apply(this, arguments);
            this.$el.find('[data-scroll]').removeClass("active")
                .filter('[data-scroll="' + (this.$target.attr('data-scroll-background-ratio') || 0) + '"]').addClass("active");
        },
        clean_for_save: function () {
            this._super.apply(this, arguments);
            this._toggle_refresh_callback(false);
        },
        on_move: function () {
            this._super.apply(this, arguments);
            this._refresh();
        },
        on_remove: function () {
            this._super.apply(this, arguments);
            this._toggle_refresh_callback(false);
        },
        _update_target_to_bg: function () {
            this.editor.styles.background.$target = this.$target.data("snippet-view").$bg;
            this.editor.styles.background.set_active();
            this.editor.styles.background_position.$target = this.$target.data("snippet-view").$bg;
            this.editor.styles.background_position.set_active();
        },
        _refresh: function () {
            _.defer((function () {
                this.$target.data("snippet-view")._rebuild();
                this._update_target_to_bg();
            }).bind(this));
        },
        _toggle_refresh_callback: function (on) {
            this.$target[on ? "on" : "off"]("snippet-option-change snippet-option-preview", this._refresh_callback);
            this.buildingBlock.$el[on ? "on" : "off"]("snippet-activated", this._refresh_callback);
            this.buildingBlock[on ? "on" : "off"]("snippet_dropped", this, this._refresh_callback);
        },
    });

    options.registry.ul = options.Class.extend({
        start: function () {
            var self = this;
            this._super();
            this.$target.data("snippet-view", new animation.registry.ul(this.$target, true));
            this.$target.on('mouseup', '.o_ul_toggle_self, .o_ul_toggle_next', function () {
                setTimeout(function () {
                    self.buildingBlock.cover_target(self.$overlay, self.$target);
                },0);
            });
        },
        reset_ul: function () {
            this.$target.find('.o_ul_toggle_self, .o_ul_toggle_next').remove();

            this.$target.find('li:has(>ul,>ol)').map(function () {
                // get if the li contain a text label
                var texts = _.filter(_.toArray(this.childNodes), function (a) { return a.nodeType === 3;});
                if (!texts.length || !texts.reduce(function (a,b) { return a.textContent + b.textContent;}).match(/\S/)) {
                    return;
                }
                $(this).children('ul,ol').addClass('o_close');
                return $(this).children(':not(ul,ol)')[0] || this;
            })
            .prepend('<a href="#" class="o_ul_toggle_self fa" />');

            var $li = this.$target.find('li:has(+li:not(>.o_ul_toggle_self)>ul, +li:not(>.o_ul_toggle_self)>ol)');
            $li.map(function () { return $(this).children()[0] || this; })
                .prepend('<a href="#" class="o_ul_toggle_next fa" />');
            $li.removeClass('o_open').next().addClass('o_close');

            this.$target.find("li").removeClass('o_open').css('list-style', '');
            this.$target.find("li:has(.o_ul_toggle_self, .o_ul_toggle_next), li:has(>ul,>ol):not(:has(>li))").css('list-style', 'none');
        },
        clean_for_save: function () {
            this._super();
            if (!this.$target.hasClass('o_ul_folded')) {
                this.$target.find(".o_close").removeClass("o_close");
            }
            this.$target.find("li:not(:has(>ul))").css('list-style', '');
        },
        toggle_class: function (type, value, $li) {
            this._super(type, value, $li);
            this.$target.data("snippet-view").stop();
            this.reset_ul();
            this.$target.find("li:not(:has(>ul))").css('list-style', '');
            this.$target.data("snippet-view", new animation.registry.ul(this.$target, true));
        }
    });

    options.registry.collapse = options.Class.extend({
        start: function () {
            var self = this;
            this._super();
            this.$target.on('shown.bs.collapse hidden.bs.collapse', '[role="tabpanel"]', function () {
                self.buildingBlock.cover_target(self.$overlay, self.$target);
            });
        },
        create_ids: function ($target) {
            var time = new Date().getTime();
            var $tab = $target.find('[data-toggle="collapse"]');

            // link to the parent group

            var $tablist = $target.closest('.panel-group');
            var tablist_id = $tablist.attr("id");
            if (!tablist_id) {
                tablist_id = "myCollapse" + time;
                $tablist.attr("id", tablist_id);
            }
            $tab.attr('data-parent', "#"+tablist_id);
            $tab.data('parent', "#"+tablist_id);

            // link to the collapse

            var $panel = $target.find('.panel-collapse');
            var panel_id = $panel.attr("id");
            if (!panel_id) {
                while($('#'+(panel_id = "myCollapseTab" + time)).length) {
                    time++;
                }
                $panel.attr("id", panel_id);
            }
            $tab.attr('data-target', "#"+panel_id);
            $tab.data('target', "#"+panel_id);
        },
        drop_and_build_snippet: function () {
            this._super();
            this.create_ids(this.$target);
        },
        on_clone: function ($clone) {
            this._super.apply(this, arguments);
            $clone.find('[data-toggle="collapse"]').removeAttr('data-target').removeData('target');
            $clone.find('.panel-collapse').removeAttr('id');
            this.create_ids($clone);
        },
        on_move: function () {
            this._super();
            this.create_ids(this.$target);
            var $panel = this.$target.find('.panel-collapse').removeData('bs.collapse');
            if ($panel.attr('aria-expanded') === 'true') {
                $panel.closest('.panel-group').find('.panel-collapse[aria-expanded="true"]')
                    .filter(function () {return this !== $panel[0];})
                    .collapse('hide')
                    .one('hidden.bs.collapse', function () {
                        $panel.trigger('shown.bs.collapse');
                    });
            }
        }
    });

    options.registry.gallery = options.Class.extend({
        start  : function () {
            this._super();
            this.bind_change();
            var index = Math.max(_.map(this.$target.find("img").get(), function (img) { return img.dataset.index | 0; }));
            this.$target.find("img:not([data-index])").each(function () {
                index++;
                $(this).attr('data-index', index).data('index', index);
            });
            this.$target.attr("contentEditable", false);

            this._temp_mode = this.$el.find("data-mode").data("mode");
            this._temp_col = this.$el.find("data-columns").data("columns");
        },
        drop_and_build_snippet: function () {
            var uuid = new Date().getTime();
            this.$target.find('.carousel').attr('id', 'slideshow_' + uuid);
            this.$target.find('[data-target]').attr('data-target', '#slideshow_' + uuid);
        },
        styling  : function (type, value) {
            var classes = this.$el.find('li[data-styling]').map(function () {
                return $(this).data('styling');
            }).get().join(' ');
            this.$target.find("img").removeClass(classes).addClass(value);
        },
        interval : function (type, value) {
            this.$target.find('.carousel:first').attr("data-interval", value);
        },
        reapply : function () {
            var self    = this,
                modes   = [ 'o_nomode', 'o_grid', 'o_masonry', 'o_slideshow' ],
                classes = this.$target.attr("class").split(/\s+/);
            this.cancel_masonry();

            modes.forEach(function (mode) {
                if (classes.indexOf(mode) >= 0) {
                    self.mode("reapply", mode.slice(2, Infinity));
                    return;
                }
            });
            this.$target.attr("contentEditable", false);
        },
        bind_change: function () {
            var self = this;
            return this.$target.find("img").off('save').on('save', function (event, img) {
                    var $parent = $(img).parent();
                    $parent.addClass("saved_active");
                    var index = self.$target.find(".item.saved_active").index();
                    $parent.removeClass("saved_active");
                    self.$target.find(".carousel:first li[data-target]:eq("+index+")").css("background-image", "url("+$(img).attr("src")+")");
                });
        },
        get_imgs: function () {
            var imgs = this.$target.find("img").addClass("img img-thumbnail img-responsive mb8 mt8").detach().get();
            imgs.sort(function (a,b) { return $(a).data('index')-$(b).data('index'); });
            return imgs;
        },
        mode: function (type, value, $li) {
            if (type !== "reapply" && type !== "click" && this._temp_mode === value) {
                return;
            }
            this._temp_mode = value;

            this.cancel_masonry();

            if (!value) value = 'nomode';
            this[value](type);
            this.$target.removeClass('o_nomode o_masonry o_grid o_slideshow').addClass("o_"+value);
            this.bind_change();
        },
        replace: function ($content) {
            var $container = this.$target.find(".container:first");
            $container.empty().append($content);
            return $container;
        },
        nomode : function (type) {
            if (type !== "reapply" && !this.$target.attr('class').match(/o_grid|o_masonry|o_slideshow/)) return;

            var $row = $('<div/>', {class: "row"});
            var $imgs = $(this.get_imgs());

            this.replace($row);

            $imgs.each(function () {
                var $wrap = $(this).wrap('<div>').parent();
                var img = this;
                if (img.width >= img.height * 2) {
                    $wrap.addClass("col-md-6");
                } else if (img.width > 600) {
                    $wrap.addClass("col-md-6");
                } else {
                    $wrap.addClass("col-md-3");
                }
                $row.append($wrap);
            });
            this.$target.css("height", "");
        },
        cancel_masonry: function () {
            clearTimeout(this.timer);
            $(this.masonry_imgs).appendTo(this.$target);
            this.masonry_imgs = [];
        },
        masonry : function (type) {
            var self     = this,
                imgs    = this.get_imgs(),
                columns  = this.get_columns(),
                colClass = undefined,
                $cols    = [];

            var $row = $("<div class='row'/>");
            this.replace($row);

            // if no columns let's default to 3, here we must update the DOM accordingly :'(
            if (columns === 0) {
                columns = 3;
                this.$target.attr("data-columns", columns);
            }
            colClass = "col-md-"+(12/columns);

            // create columns
            for (var c = 0; c < columns; c++) {
                var $col = $('<div class="col o_snippet_not_selectable"></div>').addClass(colClass);
                $row.append($col);
                $cols.push($col.get()[0]);
            }

            imgs.reverse();
            $cols = $($cols);
            function add() {
                self.lowest($cols).append(imgs.pop());
                if (imgs.length) self.timer = setTimeout(add, 0);
            }
            this.masonry_imgs = imgs;
            if (imgs.length) add();
            this.$target.css("height", "");
        },
        grid : function (type) {
            if (type !== "reapply" && this.$target.hasClass('o_grid')) return;

            var self     = this,
                $imgs    = $(this.get_imgs()),
                $col, $img,
                $row     = $('<div class="row"></div>'),
                columns  = this.get_columns() || 3,
                colClass = "col-md-"+(12/columns),
                $container = this.replace($row);

            $imgs.each(function (index) { // 0 based index
                $img = $(this);
                $col = $img.wrap('<div>').parent();
                self.img_preserve_styles($img);
                self.img_responsive($img);
                $col.addClass(colClass);
                $col.appendTo($row);
                if ( (index+1) % columns === 0) {
                    $row = $('<div class="row"></div>');
                    $row.appendTo($container);
                }
            });
            this.$target.css("height", "");
        },
        slideshow :function (type) {
            if (type !== "reapply" && this.$target.hasClass('o_slideshow')) return;

            var $imgs = $(this.get_imgs());
            var urls = $imgs.map(function () { return $(this).attr("src"); } ).get();
            var params = {
                    srcs : urls,
                    index: 0,
                    title: "",
                    interval : this.$target.data("interval") || false,
                    id: "slideshow_" + new Date().getTime()
                },
                $slideshow = $(qweb.render('website.gallery.slideshow', params));
            this.replace($slideshow);
            this.$target.find(".item img").each(function (index) {
                $(this).attr('data-index', index).data('index', index);
            });
            this.$target.css("height", Math.round(window.innerHeight*0.7));

            // apply layout animation
            this.$target.off('slide.bs.carousel').off('slid.bs.carousel');
            this.$target.find('li.fa').off('click');
            if (this.$target.data("snippet-view", view)) {
                var view = new animation.registry.gallery_slider(this.$target, true);
                this.$target.data("snippet-view", view);
            } else {
                this.$target.data("snippet-view").start(true);
            }
        },
        columns : function (type, value) {
            this.$target.attr("data-columns", value);
            if (this._temp_col !== value) {
                this._temp_col = value;
                this.reapply();
            }
        },
        images_add : function (type) {
            if(type !== "click") return;
            var self = this;
            var $container = this.$target.find(".container:first");
            var editor = new widget.MediaDialog(null, {select_images: true}, this.$target.closest('.o_editable'), null).open();
            var index = Math.max(0, _.max(_.map(this.$target.find("img").get(), function (img) { return img.dataset.index | 0; })) + 1);
            editor.on('save', this, function (attachments) {
                for (var i = 0 ; i < attachments.length; i++) {
                    $('<img class="img img-responsive mb8 mt8"/>')
                        .attr("src", attachments[i].src)
                        .attr('data-index', index+i)
                        .data('index', index+i)
                        .appendTo($container);
                }
                self.reapply(); // refresh the $target
                setTimeout(function () {
                    self.buildingBlock.make_active(self.$target);
                },0);
            });
        },
        images_rm   : function (type) {
            if(type !== "click") return;
            this.replace($('<div class="alert alert-info css_editable_mode_display"/>').text(_t("Add Images from the 'Customize' menu")));
        },
        sizing : function () { // done via css, keep it to avoid undefined error
        },
        /*
         *  helpers
         */
        styles_to_preserve : function ($img) {
            var styles = [ 'img-rounded', 'img-thumbnail', 'img-circle', 'shadow', 'fa-spin' ];
            var preserved = [];

            for (var style in styles) {
                if ($img.hasClass(style)) {
                    preserved.push(style);
                }
            }
            return preserved.join(' ');
        },
        img_preserve_styles : function ($img) {
            var classes = this.styles_to_preserve($img);
            $img.removeAttr("class");
            $img.addClass(classes);
            return $img;
        },
        img_responsive : function (img) {
            img.addClass("img img-responsive");
            return img;
        },
        lowest : function ($cols) {
            var height = 0, min = -1, lowest = undefined;
            $cols.each(function () {
                var $col = $(this);
                height = $col.height();
                if (min === -1 || height < min) {
                    min = height;
                    lowest = $col;
                }
            });
            return lowest;
        },
        get_columns : function () {
            return parseInt(this.$target.attr("data-columns") || 3);
        },

        clean_for_save: function () {
            if (this.$target.hasClass("slideshow")) {
                this.$target.removeAttr("style");
            }
        },

        set_active: function () {
            this._super();
            var classes = _.uniq((this.$target.attr("class").replace(/(^|\s)o_/g, ' ') || '').split(/\s+/));
            this.$el.find('[data-mode]')
                .removeClass("active")
                .filter('[data-mode="' + classes.join('"], [data-mode="') + '"]').addClass("active");
            var mode = this.$el.find('[data-mode].active').data('mode');

            classes = _.uniq((this.$target.find("img:first").attr("class") || '').split(/\s+/));
            this.$el.find('[data-styling]')
                .removeClass("active")
                .filter('[data-styling="' + classes.join('"], [data-styling="') + '"]').addClass("active");

            this.$el.find('li[data-interval]').removeClass("active")
                .filter('li[data-interval='+this.$target.find(".carousel:first").attr("data-interval")+']')
                .addClass("active");

            var interval = this.$target.find('.carousel:first').attr("data-interval");
            this.$el.find('[data-interval]')
                .removeClass("active")
                .filter('[data-interval=' + interval + ']').addClass("active");

            var columns = this.get_columns();
            this.$el.find('[data-columns]')
                .removeClass("active")
                .filter('[data-columns=' + columns + ']').addClass("active");

            this.$el.find('[data-columns]:first, [data-select_class="spc-none"]')
                .parent().parent().toggle(["grid", "masonry"].indexOf(mode) !== -1);
            this.$el.find('[data-interval]:first').parent().parent().toggle(mode === "slideshow");
        },
    }); // options.Class.extend

    options.registry.gallery_img = options.Class.extend({
        position: function (type, value) {
            if (type !== "click") return;

            var $parent = this.$target.closest("section");
            var editor = $parent.data('snippet-editor').styles.gallery;
            var imgs = $parent.find('img').get();
            imgs.sort(function (a,b) { return $(a).data('index')-$(b).data('index'); });

            var index = imgs.indexOf(this.$target[0]);

            switch (value) {
                case 'first': index = $(imgs.shift()).data('index')-1; break;
                case 'prev': index = index <= 1  ? $(imgs.shift()).data('index')-1 : ($(imgs[index-2]).data('index') + $(imgs[index-1]).data('index'))/2; break;
                case 'next': index = index >= imgs.length-2  ? $(imgs.pop()).data('index')+1 : ($(imgs[index+2]).data('index') + $(imgs[index+1]).data('index'))/2; break;
                case 'last': index = $(imgs.pop()).data('index')+1; break;
            }

            this.$target.data('index',index);

            this.buildingBlock.make_active(false);
            setTimeout(function () {
                editor.reapply();
            },0);
        },
        on_remove: function () {
            var $parent = snippet_editor.globalSelector.closest(this.$target.parent());
            _.defer((function () {
                this.buildingBlock.make_active($parent);
                $parent.data('snippet-editor').styles.gallery.reapply();
            }).bind(this));
        },
        on_focus: function () {
            this._super.apply(this, arguments);
            if (this._current_src && this._current_src !== this.$target.attr("src")) {
                _.defer((function () {
                    snippet_editor.globalSelector.closest(this.$target.parent()).data('snippet-editor').styles.gallery.reapply();
                }).bind(this));
            }
            this._current_src = this.$target.attr("src");
        },
    });
});
