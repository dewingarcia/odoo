# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, tools


class PosSaleReport(models.Model):
    _name = "pos.sale.report"
    _description = "Point of Sale & Sales Orders Statistics"
    _auto = False


    name = fields.Char('Order Reference', readonly=True)
    sotype = fields.Selection([('sale','Sale'),('ecommerce','Ecommerce'),('pos','point of sale')], string='Sales Type', readonly=True)
    partner_id = fields.Many2one('res.partner', 'Partner', readonly=True)
    product_id = fields.Many2one('product.product', string='Product', readonly=True)
    product_tmpl_id = fields.Many2one('product.template', 'Product Template', readonly=True)
    date_order = fields.Datetime(string='Date Order', readonly=True)
    user_id = fields.Many2one('res.users', 'Salesperson', readonly=True)
    categ_id = fields.Many2one('product.category', 'Product Category', readonly=True)
    company_id = fields.Many2one('res.company', 'Company', readonly=True)
    price_total = fields.Float('Total', readonly=True)
    pricelist_id = fields.Many2one('product.pricelist', 'Pricelist', readonly=True)
    country_id = fields.Many2one('res.country', 'Partner Country', readonly=True)
    price_subtotal = fields.Float(string='Price Subtotal', readonly=True)
    product_qty = fields.Float('Product Quantity', readonly=True)
    warehouse_id = fields.Many2one('stock.warehouse', string='Warehouse', readonly=True)
    analytic_account_id = fields.Many2one('account.analytic.account', 'Analytic Account', readonly=True)
    team_id = fields.Many2one('crm.team', 'Sales Team', readonly=True)

    def _so(self):
        so_str = """
                SELECT sol.id AS id,
                    so.name AS name,
                    CASE WHEN (SELECT salesteam_id FROM website WHERE salesteam_id IS NOT NULL) = (so.team_id) THEN 'ecommerce' ELSE 'sale' END as sotype,
                    so.partner_id AS partner_id,
                    sol.product_id AS product_id,
                    pro.product_tmpl_id AS product_tmpl_id,
                    so.date_order AS date_order,
                    so.user_id AS user_id,
                    pt.categ_id AS categ_id,
                    so.company_id AS company_id,
                    sol.price_total AS price_total,
                    so.pricelist_id AS pricelist_id,
                    rp.country_id AS country_id,
                    sol.price_subtotal AS price_subtotal,
                    (sol.product_uom_qty / u.factor * u2.factor) as product_qty,
                    so.warehouse_id  AS warehouse_id,
                    so.project_id AS analytic_account_id,
                    so.team_id AS team_id

            FROM sale_order_line sol
                    JOIN sale_order so ON (sol.order_id = so.id)
                    LEFT JOIN product_product pro ON (sol.product_id = pro.id)
                    JOIN res_partner rp ON (so.partner_id = rp.id)
                    LEFT JOIN product_template pt ON (pro.product_tmpl_id = pt.id)
                    LEFT JOIN product_pricelist pp ON (so.pricelist_id = pp.id)
                    LEFT JOIN product_uom u on (u.id=sol.product_uom)
                    LEFT JOIN product_uom u2 on (u2.id=pt.uom_id)
        """
        return so_str

    def _pos(self):
        pos_str = """
                 SELECT
                    (-1) * pol.id AS id,
                    pos.name AS name,
                    'Point Of Sale' AS sotype,
                    pos.partner_id AS partner_id,
                    pol.product_id AS product_id,
                    pro.product_tmpl_id AS product_tmpl_id,
                    pos.date_order AS date_order,
                    pos.user_id AS user_id,
                    pt.categ_id AS categ_id,
                    pos.company_id AS company_id,
                    ((pol.qty * pol.price_unit) * (100 - pol.discount) / 100) AS price_total,
                    pos.pricelist_id AS pricelist_id,
                    rp.country_id AS country_id,
                    (pol.qty * pol.price_unit) AS price_subtotal,
                    (pol.qty * u.factor) AS product_qty,
                    NULL AS warehouse_id,
                    NULL AS analytic_account_id,
                    NULL AS team_id

                FROM pos_order_line AS pol
                    JOIN pos_order pos ON (pos.id = pol.order_id)
                    LEFT JOIN product_product pro ON (pol.product_id = pro.id)
                    LEFT JOIN product_template pt ON (pro.product_tmpl_id = pt.id)
                    LEFT JOIN product_category AS pc ON (pt.categ_id = pc.id)
                    LEFT JOIN res_company AS rc ON (pos.company_id = rc.id)
                    LEFT JOIN res_partner rp ON (rc.partner_id = rp.id)
                    LEFT JOIN product_uom u ON (u.id=pt.uom_id)
         """
        return pos_str

    @api.model_cr
    def init(self):
        # self._table = po_sale_report
        tools.drop_view_if_exists(self.env.cr, self._table)
        self.env.cr.execute("""CREATE or REPLACE VIEW %s AS SELECT id AS id, name, sotype, partner_id,product_id,
            product_tmpl_id, date_order, user_id, categ_id, company_id, price_total, pricelist_id, warehouse_id,
            analytic_account_id, country_id, team_id, price_subtotal, product_qty
            FROM (
            %s
            UNION ALL
            %s
            ) AS foo""" % (self._table, self._so(), self._pos()))
