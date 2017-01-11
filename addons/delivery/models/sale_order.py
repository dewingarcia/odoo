# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging

from odoo import api, fields, models, tools, _
from odoo.exceptions import UserError
import odoo.addons.decimal_precision as dp

_logger = logging.getLogger(__name__)


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    delivery_price = fields.Float(string='Estimated Delivery Price', compute='_compute_delivery_price', store=True)
    carrier_id = fields.Many2one("delivery.carrier", string="Delivery Method", help="Fill this field if you plan to invoice the shipping based on picking.")
    invoice_shipping_on_delivery = fields.Boolean(string="Invoice Shipping on Delivery")

    @api.depends('carrier_id', 'order_line')
    def _compute_delivery_price(self):
        for order in self:
            if order.state != 'draft':
                # We do not want to recompute the shipping price of an already validated/done SO
                continue
            elif order.carrier_id.delivery_type != 'grid' and not order.order_line:
                # Prevent SOAP call to external shipping provider when SO has no lines yet
                continue
            else:
                if order.carrier_id and order.id:
                    order.delivery_price, error_msg = order._get_delivery_price(order.carrier_id)
                    if error_msg:
                        raise UserError(error_msg)

    @api.onchange('partner_id')
    def onchange_partner_id_dtype(self):
        if self.partner_id:
            self.carrier_id = self.partner_id.property_delivery_carrier_id

    @api.multi
    def action_confirm(self):
        res = super(SaleOrder, self).action_confirm()
        for so in self:
            so.invoice_shipping_on_delivery = all([not line.is_delivery for line in so.order_line])
        return res

    @api.multi
    @tools.ormcache('self.id', 'carrier.id')
    def _get_delivery_price(self, carrier):
        self.ensure_one()
        try:
            price = carrier._compute_delivery_price_for_so(self)
            error_msg = False
        except Exception as e:
            _logger.info("Carrier '%s' could not found: %s", carrier.name, e.name)
            error_msg = e.name
            price = False
        # use finally because if except raise exception than it will not cache by ormcatch
        finally:
            return price, error_msg

    @api.multi
    def _delivery_unset(self):
        self.env['sale.order.line'].search([('order_id', 'in', self.ids), ('is_delivery', '=', True)]).unlink()

    @api.multi
    def delivery_set(self):

        # Remove delivery products from the sales order
        self._delivery_unset()

        for order in self:
            carrier = order.carrier_id
            if carrier:
                if order.state not in ('draft', 'sent'):
                    raise UserError(_('The order state have to be draft to add delivery lines.'))

                if carrier.delivery_type not in ['fixed', 'base_on_rule']:
                    # Shipping providers are used when delivery_type is other than 'fixed' or 'base_on_rule'
                    price_unit, error_msg = order._get_delivery_price(carrier)
                    if error_msg and not price_unit:
                        # show error message for backend
                        raise UserError(error_msg)
                else:
                    # Classic grid-based carriers
                    carrier = order.carrier_id.verify_carrier(order.partner_shipping_id)
                    if not carrier:
                        raise UserError(_('No carrier matching.'))
                    price_unit = carrier.get_price_available(order)
                    if order.company_id.currency_id.id != order.pricelist_id.currency_id.id:
                        price_unit = order.company_id.currency_id.with_context(date=order.date_order).compute(price_unit, order.pricelist_id.currency_id)
                if price_unit is not False:
                    final_price = price_unit * (1.0 + (float(self.carrier_id.margin) / 100.0))
                    order._create_delivery_line(carrier, final_price)

            else:
                raise UserError(_('No carrier set for this order.'))

        return True

    def _create_delivery_line(self, carrier, price_unit):
        SaleOrderLine = self.env['sale.order.line']

        # Apply fiscal position
        taxes = carrier.product_id.taxes_id.filtered(lambda t: t.company_id.id == self.company_id.id)
        taxes_ids = taxes.ids
        if self.partner_id and self.fiscal_position_id:
            taxes_ids = self.fiscal_position_id.map_tax(taxes, carrier.product_id, self.partner_id).ids

        # Create the sales order line
        values = {
            'order_id': self.id,
            'name': carrier.name,
            'product_uom_qty': 1,
            'product_uom': carrier.product_id.uom_id.id,
            'product_id': carrier.product_id.id,
            'price_unit': price_unit,
            'tax_id': [(6, 0, taxes_ids)],
            'is_delivery': True,
        }
        if self.order_line:
            values['sequence'] = self.order_line[-1].sequence + 1
        sol = SaleOrderLine.sudo().create(values)
        return sol


class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    is_delivery = fields.Boolean(string="Is a Delivery", default=False)
    product_qty = fields.Float(compute='_compute_product_qty', string='Quantity', digits=dp.get_precision('Product Unit of Measure'))

    @api.depends('product_id', 'product_uom', 'product_uom_qty')
    def _compute_product_qty(self):
        for line in self:
            if not line.product_id or not line.product_uom or not line.product_uom_qty:
                return 0.0
            line.product_qty = line.product_uom._compute_quantity(line.product_uom_qty, line.product_id.uom_id)

    @api.multi
    def write(self, value):
        self.env['sale.order'].clear_caches()
        return super(SaleOrderLine, self).write(value)
