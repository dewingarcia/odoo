$(document).ready(function () {
	console.log("JS loaded");

    var qweb = openerp.qweb,
    website = openerp.website;
    website.add_template_file('/evaluation_matrix/static/src/views/evaluation_matrix.xml');

	function remove_children(comparison_factor_id) {
        var parent_ids = new Array();
                parent_ids.push(comparison_factor_id);
                while(parent_ids.length > 0){
                    var child_ids = new Array();
                    for(var i= 0; i < parent_ids.length; i++)
                    {
                        $('tr[parent-id=' + parent_ids[i] + ']').each( function(){
                            child_ids.push($(this).attr('factor-id'));
                            $(this).remove();
                        });
                    }
                    parent_ids = child_ids;
                }
    }

    $('.oe_table-comparison-factors')
        .on('click', '.show-children', function (ev) {
            ev.preventDefault();
            var $elem = $(ev.currentTarget);
            var comparison_factor_id = $elem.closest("tr").attr('factor-id');
            var children = $elem.closest("tr").data('children'); // children are displayed or hidden (hidden by default)
            if(children == "hidden") {
                var products = [];
                $('.oe_comparison-product').each(function() {
                    products.push(parseInt($(this).attr("product-id")));
                });

                $parent = $elem.closest("tr");
                var row_level = 1 + parseInt($parent[0].className.match(/row-level-([0-9]+)/)[1]);

                openerp.jsonRpc('/comparison/load_children', 'call', {
                    'comparison_factor_id': +comparison_factor_id,
                    'comparison_products': products,
                }).then(function (res) {
                    $('tr[factor-id=' + comparison_factor_id + ']').after(qweb.render("comparison.factor_children", {'comp_factor_children': res.comp_factor_children, 'comparison_results' : res.comparison_results, 'comparison_products' : res.comparison_products, 'row_level' : row_level, 'parent_id' : res.parent_id}));
                    $('tr[factor-id=' + comparison_factor_id + ']').data('children','displayed');
                });
            }
            else {
                remove_children(comparison_factor_id);
                $('tr[factor-id=' + comparison_factor_id + ']').data('children','hidden');
            }
        })
        .on('click', '.oe_create-criterion', function (ev) {
            var $elem = $(ev.currentTarget);
            var self = this;
            var category = $elem.closest("tr").attr('parent-id');

            self.wizard = $(openerp.qweb.render("comparison.create_criterion",{}));
            self.wizard.appendTo($('body')).modal({"keyboard" :true});
            self.wizard.on('click','.create', function(){
                var name = $('.name').val();
                var note = $('.note').val();
                var check = true;
                if (name ==''){
                    alert("You must give a name to your criterion.");
                    check = false;
                }
                if (check){
                    openerp.jsonRpc( '/comparison/create_criterion', 'call', { 'name':name, 'note':note, 'parent_id':category }).then(function (result) {
                        alert("Your criterion " + name + " has been added.");
                        location.reload();
                    });
                }
            });
        })
        .on('click', '.oe_up-ponderation', function(ev) {
            var $elem = $(ev.currentTarget);
            var comparison_factor_id = $elem.closest("tr").attr("factor-id");

            openerp.jsonRpc('/comparison/up_ponderation', 'call', {
                    'comparison_factor_id': +comparison_factor_id,
                }).then(function () {
                    location.reload();
                    alert("Ponderation updated.");
                });
        })
        .on('click', '.oe_down-ponderation', function(ev) {
            var $elem = $(ev.currentTarget);
            var comparison_factor_id = $elem.closest("tr").attr("factor-id");

            openerp.jsonRpc('/comparison/down_ponderation', 'call', {
                    'comparison_factor_id': +comparison_factor_id,
                }).then(function () {
                    location.reload();
                    alert("Ponderation updated.");
                });
        })
        .on('click', '.vote-down,.vote-up,.vote-3rd', function(ev) {
            ev.preventDefault();
            var $link = $(ev.currentTarget);
            openerp.jsonRpc($link.data('href'), 'call', {})
                .then(function (data) {
                    location.reload();
                    alert("Vote updated.")
                });
        });
});
