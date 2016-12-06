# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, api, models

class SaleOrder(models.Model):
    _inherit = "sale.order"

    partner_name = fields.Char(related='partner_id.name', string="Partner Name", readonly=True)

    @api.multi
    def name_get(self):
        res = []
        for order in self:
            name = order.name
            if order.partner_name:
                name = name +' - '+order.partner_name
            res.append((order.id, name))
        return res

    @api.model
    def name_search(self, name='', args=None, operator='ilike', limit=100):
        if operator not in ('ilike', 'like', '=', '=like', '=ilike'):
            return super(SaleOrder, self).name_search(name, args, operator, limit)
        args = args or []
        domain = ['|', ('name', operator, name), ('partner_name', operator, name)]
        sale_orders = self.search(domain + args, limit=limit)
        return sale_orders.name_get()
