# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models

class HrExpense(models.Model):
    _inherit = "hr.expense"

    sale_order_id = fields.Many2one('sale.order', string='Sale Order', readonly=True, states={'draft': [('readonly', False)]})

    def _create_sale_order_line(self):
        for expense in self.filtered('sale_order_id'):
            order_line_vals = {
                'order_id': expense.sale_order_id.id,
                'name': expense.name,
                'product_uom_qty': expense.quantity,
                'product_id': expense.product_id.id,
                'product_uom': expense.product_uom_id.id,
                'price_unit': expense.unit_amount,
                'tax_id': [(4, [tid.id]) for tid in expense.tax_ids],
                'price_subtotal': expense.untaxed_amount
            }
            self.env['sale.order.line'].create(order_line_vals)

    def submit_expense(self):
        res = super(HrExpense, self).submit_expense()
        self._create_sale_order_line()
        return res

    @api.multi
    def write(self, vals):
        if vals.get('sale_order_id'):
            self._create_sale_order_line()
        return super(HrExpense, self).write(vals)
