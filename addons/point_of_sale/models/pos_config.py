# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import uuid

from odoo import api, fields, models, _
from odoo.exceptions import UserError


class AccountCashboxLine(models.Model):
    _inherit = 'account.cashbox.line'

    default_pos_id = fields.Many2one('pos.config', string='This cashbox line is used by default when opening or closing a balance for this point of sale')

    @api.multi
    def name_get(self):
        result = []
        for cashbox_line in self:
            result.append((cashbox_line.id, "%s * %s"%(cashbox_line.coin_value, cashbox_line.number)))
        return result

class AccountBankStmtCashWizard(models.Model):
    _inherit = 'account.bank.statement.cashbox'
    
    @api.model
    def default_get(self, fields):
        vals = super(AccountBankStmtCashWizard, self).default_get(fields)
        config_id = self.env.context.get('default_pos_id')
        if config_id:
            lines = self.env['account.cashbox.line'].search([('default_pos_id', '=', config_id)])
            if self.env.context.get('balance', False) == 'start':
                vals['cashbox_lines_ids'] = [[0, 0, {'coin_value': line.coin_value, 'number': line.number, 'subtotal': line.subtotal}] for line in lines]
            else:
                vals['cashbox_lines_ids'] = [[0, 0, {'coin_value': line.coin_value, 'number': 0, 'subtotal': 0.0}] for line in lines]
        return vals

class PosConfig(models.Model):
    _name = 'pos.config'

    def _default_sale_journal(self):
        journal = self.env.ref('point_of_sale.pos_sale_journal', raise_if_not_found=False)
        if journal and journal.company_id == self.env.user.company_id:
            return journal
        return self._default_invoice_journal()

    def _default_invoice_journal(self):
        return self.env['account.journal'].search([('type', '=', 'sale'), ('company_id', '=', self.env.user.company_id.id)], limit=1)

    def _default_pricelist(self):
        return self.env['product.pricelist'].search([], limit=1)

    def _get_default_location(self):
        return self.env['stock.warehouse'].search([('company_id', '=', self.env.user.company_id.id)], limit=1).lot_stock_id

    def _get_default_nomenclature(self):
        return self.env['barcode.nomenclature'].search([], limit=1)

    def _get_group_pos_manager(self):
        return self.env.ref('point_of_sale.group_pos_manager')

    def _get_group_pos_user(self):
        return self.env.ref('point_of_sale.group_pos_user')

    name = fields.Char(string='Point of Sale Name', index=True, required=True, help="An internal identification of the point of sale.")
    is_shop = fields.Boolean("Is a Shop",  default=True)
    is_installed_account_accountant = fields.Boolean(compute="_compute_is_installed_account_accountant")
    journal_ids = fields.Many2many(
        'account.journal', 'pos_config_journal_rel',
        'pos_config_id', 'journal_id', string='Available Payment Methods',
        domain="[('journal_user', '=', True ), ('type', 'in', ['bank', 'cash'])]",)
    picking_type_id = fields.Many2one('stock.picking.type', string='Operation Type')
    stock_location_id = fields.Many2one(
        'stock.location', string='Stock Location',
        domain=[('usage', '=', 'internal')], required=True, default=_get_default_location)
    journal_id = fields.Many2one(
        'account.journal', string='Sales Journal',
        domain=[('type', '=', 'sale')],
        help="Accounting journal used to post sales entries.",
        default=_default_sale_journal)
    invoice_journal_id = fields.Many2one(
        'account.journal', string='Invoice Journal',
        domain=[('type', '=', 'sale')],
        help="Accounting journal used to create invoices.",
        default=_default_invoice_journal)
    currency_id = fields.Many2one('res.currency', compute='_compute_currency', string="Currency")
    iface_cashdrawer = fields.Boolean(string='Cashdrawer', help="Automatically open the cashdrawer.")
    iface_payment_terminal = fields.Boolean(string='Payment Terminal', help="Enables Payment Terminal integration.")
    iface_electronic_scale = fields.Boolean(string='Electronic Scale', help="Enables Electronic Scale integration.")
    iface_vkeyboard = fields.Boolean(string='Virtual KeyBoard', help="Don’t turn this option on if you take orders on smartphones or tablets. \n Such devices already benefit from a native keyboard.")
    iface_print_via_proxy = fields.Boolean(string='Print via Proxy', help="Bypass browser printing and prints via the hardware proxy.")
    iface_scan_via_proxy = fields.Boolean(string='Scan via Proxy', help="Enable barcode scanning with a remotely connected barcode scanner.")
    iface_invoicing = fields.Boolean(string='Invoicing', help='Enables invoice generation from the Point of Sale.', default=True)
    iface_big_scrollbars = fields.Boolean('Large Scrollbars', help='For imprecise industrial touchscreens.')
    iface_print_auto = fields.Boolean(string='Automatic Receipt Printing', default=False,
        help='The receipt will automatically be printed at the end of each order.')
    iface_print_skip_screen = fields.Boolean(string='Skip Receipt Screen', default=True,
        help='The receipt screen will be skipped if the receipt can be printed automatically.')
    iface_precompute_cash = fields.Boolean(string='Prefill Cash Payment',
        help='The payment input will behave similarily to bank payment input, and will be prefilled with the exact due amount.')
    iface_tax_included = fields.Boolean(string='Include Taxes in Prices',
        help='The displayed prices will always include all taxes, even if the taxes has been set up differently.')
    iface_start_categ_id = fields.Many2one('pos.category', string='Start Category',
        help='The point of sale will display this product category by default. If no category is specified, all available products will be shown.')
    iface_display_categ_images = fields.Boolean(string='Display Category Pictures',
        help="The product categories will be displayed with pictures.")
    cash_control = fields.Boolean(string='Cash Control')
    receipt_header = fields.Text(string='Receipt Header', help="A short text that will be inserted as a header in the printed receipt.")
    receipt_footer = fields.Text(string='Receipt Footer', help="A short text that will be inserted as a footer in the printed receipt.")
    proxy_ip = fields.Char(string='IP Address', size=45,
        help='The hostname or ip address of the hardware proxy, Will be autodetected if left empty.')
    active = fields.Boolean(default=True)
    uuid = fields.Char(readonly=True, default=lambda self: str(uuid.uuid4()),
        help='A globally unique identifier for this pos configuration, used to prevent conflicts in client-generated data.')
    sequence_id = fields.Many2one('ir.sequence', string='Order IDs Sequence', readonly=True,
        help="This sequence is automatically created by Odoo but you can change it "
        "to customize the reference numbers of your orders.", copy=False)
    sequence_line_id = fields.Many2one('ir.sequence', string='Order Line IDs Sequence', readonly=True,
        help="This sequence is automatically created by Odoo but you can change it "
        "to customize the reference numbers of your orders lines.", copy=False)
    session_ids = fields.One2many('pos.session', 'config_id', string='Sessions')
    current_session_id = fields.Many2one('pos.session', compute='_compute_current_session', string="Current Session")
    current_session_state = fields.Char(compute='_compute_current_session')
    last_session_closing_cash = fields.Float(compute='_compute_last_session')
    last_session_closing_date = fields.Date(compute='_compute_last_session')
    pos_session_username = fields.Char(compute='_compute_current_session_user')
    group_by = fields.Boolean(string='Group Journal Items', default=True,
        help="Check this if you want to group the Journal Items by Product while closing a Session.")
    pricelist_id = fields.Many2one('product.pricelist', string='Pricelist', required=True, default=_default_pricelist)
    company_id = fields.Many2one('res.company', string='Company', required=True, default=lambda self: self.env.user.company_id)
    barcode_nomenclature_id = fields.Many2one('barcode.nomenclature', string='Barcode Nomenclature', required=True, default=_get_default_nomenclature,
        help='Defines what kind of barcodes are available and how they are assigned to products, customers and cashiers.')
    group_pos_manager_id = fields.Many2one('res.groups', string='Point of Sale Manager Group', default=_get_group_pos_manager,
        help='This field is there to pass the id of the pos manager group to the point of sale client.')
    group_pos_user_id = fields.Many2one('res.groups', string='Point of Sale User Group', default=_get_group_pos_user,
        help='This field is there to pass the id of the pos user group to the point of sale client.')
    tip_product_id = fields.Many2one('product.product', string='Tip Product',
        help="The product used to encode the customer tip. Leave empty if you do not accept tips.")
    fiscal_position_ids = fields.Many2many('account.fiscal.position', string='Fiscal Positions', help='This is useful for restaurants with onsite and take-away services that imply specific tax rates.')
    default_fiscal_position_id = fields.Many2one('account.fiscal.position', string='Default Fiscal Position')
    default_cashbox_lines_ids = fields.One2many('account.cashbox.line', 'default_pos_id', string='Default Balance')
    group_product_variant = fields.Boolean("Attributes & Variants")
    default_sale_price = fields.Boolean("A single sale price per product")
    default_pricelist_setting = fields.Selection([
        ('percentage', 'Multiple prices per product (e.g. per quantity, per PoS)'),
        ('formula', 'Price computed from formulas (discounts, margins, rounding)')
        ], string="Pricelists", default="percentage")
    tax_regime = fields.Boolean("Tax Regime")
    tax_regime_selection = fields.Boolean("Tax Regime Selection value")
    barcode_scanner = fields.Boolean("Barcode Scanner")
    start_category = fields.Boolean("Set Start Category")
    use_pos_restaurant = fields.Boolean("Is a Bar/Restaurant")
    use_pos_discount = fields.Boolean("Global Discounts")
    use_pos_loyalty = fields.Boolean("Loyalty Program")
    use_pos_data_drinks = fields.Boolean(string="Import common drinks data")
    use_pos_mercury = fields.Boolean(string="Integrated Card Payments")
    use_pos_reprint = fields.Boolean(string="Reprint Receipt")
    is_posbox = fields.Boolean("PosBox")
    is_header_or_footer = fields.Boolean("Header & Footer")

    @api.multi
    def _compute_is_installed_account_accountant(self):
        self.is_installed_account_accountant = self.env['ir.module.module'].search([('name', '=', 'account_accountant'), ('state', '=', 'installed')]).id

    @api.depends('journal_id.currency_id', 'journal_id.company_id.currency_id')
    def _compute_currency(self):
        for pos_config in self:
            if pos_config.journal_id:
                pos_config.currency_id = pos_config.journal_id.currency_id.id or pos_config.journal_id.company_id.currency_id.id
            else:
                pos_config.currency_id = self.env.user.company_id.currency_id.id

    @api.depends('session_ids')
    def _compute_current_session(self):
        for pos_config in self:
            session = pos_config.session_ids.filtered(lambda r: r.user_id.id == self.env.uid and not r.state == 'closed')
            pos_config.current_session_id = session
            pos_config.current_session_state = session.state

    @api.depends('session_ids')
    def _compute_last_session(self):
        PosSession = self.env['pos.session']
        for pos_config in self:
            session = PosSession.search_read(
                [('config_id', '=', pos_config.id), ('state', '=', 'closed')],
                ['cash_register_balance_end_real', 'stop_at'],
                order="stop_at desc", limit=1)
            if session:
                pos_config.last_session_closing_cash = session[0]['cash_register_balance_end_real']
                pos_config.last_session_closing_date = session[0]['stop_at']
            else:
                pos_config.last_session_closing_cash = 0
                pos_config.last_session_closing_date = False

    @api.depends('session_ids')
    def _compute_current_session_user(self):
        for pos_config in self:
            pos_config.pos_session_username = pos_config.session_ids.filtered(lambda s: s.state == 'opened').user_id.name

    @api.constrains('company_id', 'stock_location_id')
    def _check_company_location(self):
        if self.stock_location_id.company_id and self.stock_location_id.company_id.id != self.company_id.id:
            raise UserError(_("The company of the stock location is different than the one of point of sale"))

    @api.constrains('company_id', 'journal_id')
    def _check_company_journal(self):
        if self.journal_id and self.journal_id.company_id.id != self.company_id.id:
            raise UserError(_("The company of the sales journal is different than the one of point of sale"))

    @api.constrains('company_id', 'invoice_journal_id')
    def _check_company_journal(self):
        if self.invoice_journal_id and self.invoice_journal_id.company_id.id != self.company_id.id:
            raise UserError(_("The invoice journal and the point of sale must belong to the same company"))

    @api.constrains('company_id', 'journal_ids')
    def _check_company_payment(self):
        if self.env['account.journal'].search_count([('id', 'in', self.journal_ids.ids), ('company_id', '!=', self.company_id.id)]):
            raise UserError(_("The company of a payment method is different than the one of point of sale"))

    @api.constrains('fiscal_position_ids', 'default_fiscal_position_id')
    def _check_default_fiscal_position(self):
        if self.default_fiscal_position_id and self.default_fiscal_position_id not in self.fiscal_position_ids:
            raise UserError(_("The default fiscal position must be included in the available fiscal positions of the point of sale"))

    @api.onchange('iface_print_via_proxy')
    def _onchange_iface_print_via_proxy(self):
        self.iface_print_auto = self.iface_print_via_proxy

    @api.onchange('picking_type_id')
    def _onchange_picking_type_id(self):
        if self.picking_type_id.default_location_src_id.usage == 'internal' and self.picking_type_id.default_location_dest_id.usage == 'customer':
            self.stock_location_id = self.picking_type_id.default_location_src_id.id

    @api.onchange('default_sale_price')
    def _onchange_default_sale_price(self):
        self.default_pricelist_setting = self.default_sale_price and 'percentage'

    @api.onchange('iface_scan_via_proxy')
    def _onchange_default_sale_price(self):
        if self.iface_scan_via_proxy:
            self.barcode_scanner = self.iface_scan_via_proxy

    @api.onchange('is_posbox')
    def _onchange_is_posbox(self):
        if not self.is_posbox:
            self.proxy_ip = False

    @api.multi
    def name_get(self):
        result = []
        for config in self:
            if (not config.session_ids) or (config.session_ids[0].state == 'closed'):
                result.append((config.id, config.name + ' (' + _('not used') + ')'))
                continue
            result.append((config.id, config.name + ' (' + config.session_ids[0].user_id.name + ')'))
        return result

    def action_open_point_of_sale(self):
        pos_config_count = self.search_count([])
        values =  {
            'name': _('Point of Sale'),
            'type': 'ir.actions.act_window',
            'view_type': 'form',
            'view_mode': 'tree,form',
            'res_model': 'pos.config',
        }
        if pos_config_count <= 1:
            values['view_mode'] = 'form'
            values['res_id'] =  self.search([], limit=1).id
            values['flags'] = {'initial_mode': 'edit'}
        return values

    @api.model
    def create(self, values):
        IrSequence = self.env['ir.sequence']
        val = {
            'name': _('POS Order %s') % values['name'],
            'padding': 4,
            'prefix': "%s/" % values['name'],
            'code': "pos.order",
            'company_id': values.get('company_id', False),
        }
        # force sequence_id field to new pos.order sequence
        values['sequence_id'] = IrSequence.create(val).id

        val.update(name=_('POS order line %s') % values['name'], code='pos.order.line')
        values['sequence_line_id'] = IrSequence.create(val).id
        pos_config = super(PosConfig, self).create(values)
        pos_config.sudo()._check_group_enabled()
        pos_config.sudo()._check_modules_to_install()
        # If you plan to add something after this, use a new environment. The one above is no longer valid after the modules install.
        return pos_config

    @api.multi
    def write(self, vals):
        result = super(PosConfig, self).write(vals)
        self.sudo()._check_group_enabled()
        self.sudo()._check_modules_to_install()
        # If you plan to add something after this, use a new environment. The one above is no longer valid after the modules install.
        return result

    @api.multi
    def unlink(self):
        for pos_config in self.filtered(lambda pos_config: pos_config.sequence_id or pos_config.sequence_line_id):
            pos_config.sequence_id.unlink()
            pos_config.sequence_line_id.unlink()
        return super(PosConfig, self).unlink()

    def _check_group_enabled(self):
        pos_user = self.env.ref('point_of_sale.group_pos_user')
        group_product_pricelist = self.env.ref('product.group_product_pricelist')
        group_pricelist_item = self.env.ref('product.group_pricelist_item')
        group_sale_pricelist = self.env.ref('product.group_sale_pricelist')
        group_product_variant = self.env.ref('product.group_product_variant')
        has_pricelist_group = self.user_has_groups('product.group_product_pricelist')
        has_pricelist_item_group = self.user_has_groups('product.group_pricelist_item')
        has_sale_pricelist_group = self.user_has_groups('product.group_sale_pricelist')

        for pos_config in self:
            pos_pricelist_setting = pos_config.default_sale_price and pos_config.default_pricelist_setting or 'fixed'
            if pos_pricelist_setting == 'formula' and not has_pricelist_item_group:
                pos_user.write({'implied_ids': [(4, group_pricelist_item.id), (3, group_product_pricelist.id)]})
                group_product_pricelist.write({'users': [(3, self.env.uid)]})
            elif pos_pricelist_setting == 'percentage' and not has_pricelist_group:
                pos_user.write({'implied_ids': [(4, group_product_pricelist.id), (3, group_pricelist_item.id)]})
                group_pricelist_item.write({'users': [(3, self.env.uid)]})
            else:
                pos_user.write({'implied_ids': [(3, group_sale_pricelist.id), (3, group_pricelist_item.id), (3, group_product_pricelist.id)]})
                group_sale_pricelist.write({'users': [(3, self.env.uid)]})
                group_pricelist_item.write({'users': [(3, self.env.uid)]})
                group_product_pricelist.write({'users': [(3, self.env.uid)]})

            if self.group_product_variant and not self.user_has_groups('product.group_product_variant'):
                pos_user.write({'implied_ids': [(4, group_product_variant.id)]})
            elif self.user_has_groups('product.group_product_variant'):
                pos_user.write({'implied_ids': [(3, group_product_variant.id)]})
                group_product_variant.write({'users': [(3, self.env.uid)]})

    def _check_modules_to_install(self):
        module_installed = False
        for pos_config in self:
            pos_restaurant_module = self.env['ir.module.module'].search([('name', '=', 'pos_restaurant')])
            if pos_config.use_pos_restaurant and pos_restaurant_module.state not in ('installed', 'to install', 'to upgrade'):
                pos_restaurant_module.button_immediate_install()
                module_installed = True

            pos_discount_module = self.env['ir.module.module'].search([('name', '=', 'pos_discount')])
            if pos_config.use_pos_discount and pos_discount_module.state not in ('installed', 'to install', 'to upgrade'):
               pos_discount_module.button_immediate_install()
               module_installed = True

            pos_loyalty_module = self.env['ir.module.module'].search([('name', '=', 'pos_loyalty')])
            if pos_config.use_pos_loyalty and pos_loyalty_module.state not in ('installed', 'to install', 'to upgrade'):
               pos_loyalty_module.button_immediate_install()
               module_installed = True

            pos_data_drinks_module = self.env['ir.module.module'].search([('name', '=', 'pos_data_drinks')])
            if pos_config.use_pos_data_drinks and pos_data_drinks_module.state not in ('installed', 'to install', 'to upgrade'):
               pos_data_drinks_module.button_immediate_install()
               module_installed = True

            pos_mercury_module = self.env['ir.module.module'].search([('name', '=', 'pos_mercury')])
            if pos_config.use_pos_mercury and pos_mercury_module.state not in ('installed', 'to install', 'to upgrade'):
               pos_mercury_module.button_immediate_install()
               module_installed = True

            pos_reprint_module = self.env['ir.module.module'].search([('name', '=', 'pos_reprint')])
            if pos_config.use_pos_reprint and pos_reprint_module.state not in ('installed', 'to install', 'to upgrade'):
               pos_reprint_module.button_immediate_install()
               module_installed = True
        # just in case we want to do something if we install a module. (like a refresh ...)
        return module_installed

    # Methods to open the POS
    @api.multi
    def open_ui(self):
        assert len(self.ids) == 1, "you can open only one session at a time"
        return {
            'type': 'ir.actions.act_url',
            'url':   '/pos/web/',
            'target': 'self',
        }

    @api.multi
    def open_existing_session_cb_close(self):
        assert len(self.ids) == 1, "you can open only one session at a time"
        if self.current_session_id.cash_control:
            self.current_session_id.action_pos_session_closing_control()
        return self.open_session_cb()

    @api.multi
    def open_session_cb(self):
        assert len(self.ids) == 1, "you can open only one session at a time"
        if not self.current_session_id:
            self.current_session_id = self.env['pos.session'].create({
                'user_id': self.env.uid,
                'config_id': self.id
            })
            if self.current_session_id.state == 'opened':
                return self.open_ui()
            return self._open_session(self.current_session_id.id)
        return self._open_session(self.current_session_id.id)

    @api.multi
    def open_existing_session_cb(self):
        assert len(self.ids) == 1, "you can open only one session at a time"
        return self._open_session(self.current_session_id.id)

    def _open_session(self, session_id):
        return {
            'name': _('Session'),
            'view_type': 'form',
            'view_mode': 'form,tree',
            'res_model': 'pos.session',
            'res_id': session_id,
            'view_id': False,
            'type': 'ir.actions.act_window',
        }
