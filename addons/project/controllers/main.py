# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import http
from odoo.http import request


class ProjectController(http.Controller):

    @http.route('/project/plan/<int:project_id>', type='http', auth='user', methods=['GET'])
    def plan(self, project_id):
        project = request.env['project.project'].browse(project_id)
        values = self._prepare_plan_values(project)
        return request.render('project.project_plan', values)

    def _prepare_plan_values(self, project):
        user_id = request.env.user.id
        values = {
            'project': project,
        }
        if project.use_tasks:
            values.setdefault('todo', {}).update({
                'task_my': request.env['project.task'].search_count([('project_id', 'in', project.ids), ('user_id', '=', user_id), '|', ('stage_id.fold', '=', False), ('stage_id', '=', False)]),
                'task_my_activities': request.env['project.task'].search_count([('project_id', 'in', project.ids), ('user_id', '=', user_id), ('activity_ids.user_id', '=', user_id), '|', ('stage_id.fold', '=', False), ('stage_id', '=', False)]),
                'task_my_needaction': project.task_needaction_count,
                'task_all': project.task_count,
                'task_all_activities': request.env['project.task'].search_count([('project_id', 'in', project.ids), ('activity_ids.user_id', '=', user_id), '|', ('stage_id.fold', '=', False), ('stage_id', '=', False)]),
            })
        return values
