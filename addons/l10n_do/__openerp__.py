# -*- coding: utf-8 -*-

# Author: Gustavo Valverde. iterativo | Consultor de Odoo
# Contributors: Edser Solis - iterativo

# Copyright (c) 2016 - Present | Novum Ingenieria, SRL. - www.iterativo.do
# All rights reserved.

{
    'name': 'Dominican Republic - Accounting',
    'version': '2.0',
    'category': 'Localization',
    'description': """

Localization Module for Dominican Republic
===========================================

Catálogo de Cuentas e Impuestos para República Dominicana, Compatible para
**Internacionalización** con **NIIF** y alineado a las normas y regulaciones
de la Dirección General de Impuestos Internos (**DGII**).

**Este módulo consiste de:**

- Catálogo de Cuentas Estándar (alineado a DGII y NIIF)
- Catálogo de Impuestos con la mayoría de Impuestos Preconfigurados
        - ITBIS** para compras y ventas
        - Retenciones de ITBIS
        - Retenciones de ISR
        - Grupos de Impuestos y Retenciones:
                - Telecomunicaiones
                - Proveedores de Materiales de Construcción
                - Personas Físicas Proveedoras de Servicios
        - Otros impuestos
- Diarios Preconfigurados para manejo de la mayoría de los NCF
        - Facturas con Valor Fiscal (para Ventas)
        - Facturas para Consumidores Finales
        - Notas de Débito y Crédito
        - Registro de Proveedores Informales
        - Registro de Gastos Menores
        - Gubernamentales
- Posiciones Fiscales para automatización de impuestos y retenciones
        - Cambios de Impuestos a Exenciones (Ej. Ventas al Estado)
        - Cambios de Impuestos a Retenciones (Ej. Compra Servicios al Exterior)
        - Entre otros

**Nota:**
Este módulo no soporta NCF con Valor Fiscal para compras, ya que los
mismos poseen un comportamiento diferente a los demás debido a que deben
ser introducidos de forma manual, por lo que no han sido configurados a través
de los diarios.

    """,
    'author': 'Gustavo Valverde - iterativo | Consultores de Odoo',
    'website': 'http://iterativo.do',
    'depends': ['account', 'purchase', 'sale', 'base_iban'],
    'data': [
        # Journal Model
        'data/ir_model_data.xml',
        # Basic accounting data
        'data/coa_template.xml',
        'data/account_type.xml',
        'data/account.account.template.csv',
        'data/tax_template.xml',
        'data/account_defaults.xml',
        # Country States
        'data/l10n_do_base_data.xml',
        # Adds fiscal position
        'data/fiscal_position_template.xml',
        # configuration wizard, views, reports...
        'data/account_chart_template.yml',
        # Journals and their sequences
        'data/ir_sequence.xml',
        'data/account_journal.xml',
        ],
    'test': [],
    'demo': [],
    'installable': True,
    'auto_install': False,
}
