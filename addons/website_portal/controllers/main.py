# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import http
from odoo.http import request
from odoo import tools
from odoo.tools.translate import _

from odoo.fields import Date

from odoo.addons.base.ir.ir_ui_view import keep_query


def get_records_pager(ids, current):
    if current.id in ids:
        idx = ids.index(current.id)
        return {
            'prev_record': idx != 0 and current.browse(ids[idx - 1]).website_url,
            'next_record': idx < len(ids) - 1 and current.browse(ids[idx + 1]).website_url
        }
    return {}


class website_account(http.Controller):

    MANDATORY_BILLING_FIELDS = ["name", "phone", "email", "street", "city", "country_id"]
    OPTIONAL_BILLING_FIELDS = ["zipcode", "state_id", "vat", "company_name"]

    _items_per_page = 5

    def _prepare_portal_layout_values(self):
        """ prepare the values to render portal layout template. This returns the
            data displayed on every portal pages.
        """
        partner = request.env.user.partner_id
        # get customer sales rep
        if partner.user_id:
            sales_rep = partner.user_id
        else:
            sales_rep = False
        values = {
            'sales_rep': sales_rep,
            'company': request.website.company_id,
            'user': request.env.user
        }
        return values

    def _get_archive_groups(self, model, domain=None, fields=None, groupby="create_date", order="create_date desc"):
        if not model:
            return []
        if domain is None:
            domain = []
        if fields is None:
            fields = ['name', 'create_date']
        groups = []
        for group in request.env[model]._read_group_raw(domain, fields=fields, groupby=groupby, orderby=order):
            dates, label = group[groupby]
            date_begin, date_end = dates.split('/')
            groups.append({
                'date_begin': Date.to_string(Date.from_string(date_begin)),
                'date_end': Date.to_string(Date.from_string(date_end)),
                'name': label,
                'item_count': group[groupby + '_count']
            })
        return groups

    def _get_navigation_urls(self, record, domain=[], order_by='caca DESC'):
        # domain from rules and filter by
        domain_rules = request.env['ir.rule']._compute_domain(record._name, 'read')
        domain += domain_rules

        # build query, using ORM for secuity matter
        query = record._where_calc(domain)
        record._apply_ir_rules(query, 'read') ## TODO JEM requited ?
        from_clause, where_clause, where_clause_params = query.get_sql()
        where_str = where_clause or ''

        # check that order_by is valid
        try:
            record._generate_order_by(order_by, query)
        except ValueError:
            order_by = 'create_date DESC'

        # Compute next and prev with only one query SQL.
        # NOTE: This may be problematic with the condition like ('id', 'in', [ids])
        # if ids is a too long list. We should then use `split_for_in_conditions`
        # but this will break the performance.
        query = """SELECT *
                FROM (
                    SELECT  %s.id,
                        LAG(%s.id) over (order by %s) as prev_id,
                        LEAD(%s.id) over (order by %s) as next_id
                    FROM %s
                    WHERE %s
                ) x
                WHERE id=%%s AND id IN (id, prev_id, next_id)
            """ % (record._table, record._table, order_by, record._table, order_by, from_clause, where_str)

        request.env.cr.execute(query, where_clause_params + [record.id])
        result = request.env.cr.dictfetchall()
        result = result[0] if len(result) else {}

        prev_url = False
        if result.get('prev_id'):
            prev_url = '%s?%s' % (record.browse(result['prev_id']).website_url, keep_query())
        next_url = False
        if result.get('next_id'):
            next_url = '%s?%s' % (record.browse(result['next_id']).website_url, keep_query())
        return {
            'nav_prev_url': prev_url,
            'nav_next_url': next_url,
        }

    @http.route(['/my', '/my/home'], type='http', auth="user", website=True)
    def account(self, **kw):
        values = self._prepare_portal_layout_values()
        return request.render("website_portal.portal_my_home", values)

    @http.route(['/my/account'], type='http', auth='user', website=True)
    def details(self, redirect=None, **post):
        partner = request.env.user.partner_id
        values = {
            'error': {},
            'error_message': []
        }

        if post:
            error, error_message = self.details_form_validate(post)
            values.update({'error': error, 'error_message': error_message})
            values.update(post)
            if not error:
                values = {key: post[key] for key in self.MANDATORY_BILLING_FIELDS}
                values.update({key: post[key] for key in self.OPTIONAL_BILLING_FIELDS if key in post})
                values.update({'zip': values.pop('zipcode', '')})
                partner.sudo().write(values)
                if redirect:
                    return request.redirect(redirect)
                return request.redirect('/my/home')

        countries = request.env['res.country'].sudo().search([])
        states = request.env['res.country.state'].sudo().search([])

        values.update({
            'partner': partner,
            'countries': countries,
            'states': states,
            'has_check_vat': hasattr(request.env['res.partner'], 'check_vat'),
            'redirect': redirect,
        })

        return request.render("website_portal.details", values)

    def details_form_validate(self, data):
        error = dict()
        error_message = []

        # Validation
        for field_name in self.MANDATORY_BILLING_FIELDS:
            if not data.get(field_name):
                error[field_name] = 'missing'

        # email validation
        if data.get('email') and not tools.single_email_re.match(data.get('email')):
            error["email"] = 'error'
            error_message.append(_('Invalid Email! Please enter a valid email address.'))

        # vat validation
        if data.get("vat") and hasattr(request.env["res.partner"], "check_vat"):
            if request.website.company_id.vat_check_vies:
                # force full VIES online check
                check_func = request.env["res.partner"].vies_vat_check
            else:
                # quick and partial off-line checksum validation
                check_func = request.env["res.partner"].simple_vat_check
            vat_country, vat_number = request.env["res.partner"]._split_vat(data.get("vat"))
            if not check_func(vat_country, vat_number):  # simple_vat_check
                error["vat"] = 'error'

        # error message for empty required fields
        if [err for err in error.values() if err == 'missing']:
            error_message.append(_('Some required fields are empty.'))

        unknown = [k for k in data.iterkeys() if k not in self.MANDATORY_BILLING_FIELDS + self.OPTIONAL_BILLING_FIELDS]
        if unknown:
            error['common'] = 'Unknown field'
            error_message.append("Unknown field '%s'" % ','.join(unknown))

        return error, error_message
