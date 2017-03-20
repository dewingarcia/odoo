# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import http
from odoo.exceptions import AccessError
from odoo.http import request


class HrOrgChartController(http.Controller):

    def _prepare_employee_data(self, employee):
        return dict(
            id=employee.id,
            name=employee.name,
            link='/mail/view?model=hr.employee&res_id=%s' % employee.id,
            job_id=employee.job_id.id,
            job_name=employee.job_id.name or '',
            direct_sub_count=len(employee.child_ids),
            indirect_sub_count=len(employee.child_ids) + sum(len(child.child_ids) for child in employee.child_ids),
        )

    @http.route('/hr/get_org_chart', type='json', auth='user')
    def get_org_chart(self, employee_id):
        if not employee_id:  # to check
            return {}

        employee = request.env['hr.employee'].browse(employee_id)
        # check and raise

        # compute employee data for org chart
        ancestors, current = request.env['hr.employee'], employee
        while current.parent_id:
            ancestors |= current.parent_id
            current = current.parent_id

        values = dict(
            self=self._prepare_employee_data(employee),
            managers=[self._prepare_employee_data(ancestor) for idx, ancestor in enumerate(ancestors) if idx < 2],
            children=[self._prepare_employee_data(child) for child in employee.child_ids],
            more_managers=len(ancestors) > 2,
        )
        return values
