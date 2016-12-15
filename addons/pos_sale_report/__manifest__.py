# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Sales Report',
    'category': 'Sales',
    'summary': 'Analysis for all sales',
    'description': """
Allows to analyse the total sales through report
================================================

This module allows you to view all your sales report
from Sales, Point of sale and eCommerce module.
""",
    'depends': ['sale', 'point_of_sale', 'website_sale'],
    'data': [
          'security/ir.model.access.csv',
          'report/pos_sale_report_views.xml',
    ],
    'auto_install': True,
}
