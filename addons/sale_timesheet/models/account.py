# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class AccountAnalyticLine(models.Model):
    _inherit = 'account.analytic.line'

    timesheet_invoice_type = fields.Selection([
        ('billable_time', 'Billable Time'),
        ('billable_fixed', 'Billable Fixed'),
        ('non_billable', 'Non Billable')], string="Billable Type", readonly=True)
    timesheet_invoice_id = fields.Many2one('account.invoice', string="Invoice", readonly=True, help="Invoice created from the timesheet")
    timesheet_revenue = fields.Float("Revenue", default=0.0, readonly=True)

    @api.model
    def create(self, values):
        if values.get('task_id'):
            task = self.env['project.task'].browse(values['task_id'])
            values['so_line'] = task.sale_line_id.id or values.get('so_line', False)
        values.update(self._get_timesheet_values(values))
        values.update(self._get_timesheet_billing_values(values))
        return super(AccountAnalyticLine, self).create(values)

    @api.multi
    def write(self, values):
        so_lines = self.mapped('so_line')
        if values.get('task_id'):
            task = self.env['project.task'].browse(values['task_id'])
            values['so_line'] = task.sale_line_id.id or values.get('so_line', False)
        for line in self:
            values.update(line._get_timesheet_values(values))
            values.update(line._get_timesheet_billing_values(values))
            super(AccountAnalyticLine, line).write(values)

        # Update delivered quantity on SO lines which are not linked to the analytic lines anymore
        so_lines -= self.mapped('so_line')
        if so_lines:
            so_lines.with_context(force_so_lines=so_lines).sudo()._compute_analytic()
        return True

    def _get_timesheet_values(self, values):
        result = {}
        values = values if values is not None else {}
        if values.get('project_id') or self.project_id:
            if values.get('amount'):
                return {}
            unit_amount = values.get('unit_amount', 0.0) or self.unit_amount
            user_id = values.get('user_id') or self.user_id.id or self._default_user()
            user = self.env['res.users'].browse([user_id])
            emp = self.env['hr.employee'].search([('user_id', '=', user_id)], limit=1)
            cost = emp and emp.timesheet_cost or 0.0
            uom = (emp or user).company_id.project_time_mode_id
            # Nominal employee cost = 1 * company project UoM (project_time_mode_id)
            result.update({
                'amount': -unit_amount * cost,
                'product_uom_id': uom.id,
                'account_id': values.get('account_id') or self.account_id.id or emp.account_id.id,
            })
        return result

    def _get_timesheet_billing_values(self, values):
        """
            If invoice on delivered quantity:
                timesheet hours * (SO Line Price) * (1- discount),
            elif invoice on ordered quantities & create task:
                min (
                    timesheet hours * (SO Line unit price) * (1- discount),
                    TOTAL SO - TOTAL INVOICED - sum(timesheet revenues with invoice_id=False)
                )
            else:
                0
        """
        result = {}
        unit_amount = values.get('unit_amount', 0.0) or self.unit_amount
        so_line_id = values.get('so_line') or self.so_line.id
        if so_line_id and not self.env.context.get('create'):
            # set the revenue and billable type according to the product and the SO line
            so_line = self.env['sale.order.line'].browse(so_line_id)
            if so_line.product_id.type == 'service':
                revenue = 0.0
                billable_type = 'non_billable'
                # calculate the revenue on the timesheet
                if so_line.product_id.invoice_policy == 'delivery':
                    revenue = unit_amount * so_line.price_unit * (1-so_line.discount)
                    billable_type = 'billable_time'
                elif so_line.product_id.invoice_policy == 'order' and so_line.product_id.track_service == 'task':
                    # compute the total revenue the SO since we are in fixed price
                    total_revenue_so = so_line.product_uom_qty * so_line.price_unit * (1-so_line.discount)
                    # compute the total revenue already existing (without the current timesheet line)
                    domain = [('so_line', '=', so_line.id)]
                    if self.ids:
                        domain += [('id', 'not in', self.ids)]
                    analytic_lines = self.sudo().search(domain)
                    total_revenue_invoiced = sum(analytic_lines.mapped('timesheet_revenue'))
                    # compute (new) revenue of current timesheet line
                    revenue = min(
                        unit_amount * (so_line.price_unit) * (1-so_line.discount),
                        total_revenue_so - total_revenue_invoiced
                    )
                    billable_type = 'billable_fixed'

                result['timesheet_revenue'] = revenue
                result['timesheet_invoice_type'] = billable_type
        return result

    def _get_sale_order_line(self, vals=None):
        result = dict(vals or {})
        if self.project_id:
            if result.get('so_line'):
                sol = self.env['sale.order.line'].browse([result['so_line']])
            else:
                sol = self.so_line
            if not sol:
                sol = self.env['sale.order.line'].search([
                    ('order_id.project_id', '=', self.account_id.id),
                    ('state', 'in', ('sale', 'done')),
                    ('product_id.track_service', '=', 'timesheet'),
                    ('product_id.type', '=', 'service')],
                    limit=1)
            if sol:
                result.update({
                    'so_line': sol.id,
                    'product_id': sol.product_id.id,
                })
                result.update(self._get_timesheet_values(result))

        return super(AccountAnalyticLine, self)._get_sale_order_line(vals=result)
