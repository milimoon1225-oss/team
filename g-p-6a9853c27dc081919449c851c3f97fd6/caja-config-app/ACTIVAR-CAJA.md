# Caja y Configuración

La vista local incluye las dos pantallas. Para guardar y consultar datos reales, ejecutar `activar-caja-config.sql` en una nueva consulta del SQL Editor del mismo proyecto Supabase usado por Creativa. Requiere la actualización de pedidos ya instalada. No elimina datos existentes.

Después de ver Success, actualizar la aplicación y abrir Caja o Configuración.

Caja incorpora automáticamente los pagos de pedidos. Registrar aquí solamente otros ingresos, fondo de apertura y gastos. Cada día debe registrarse el fondo disponible al inicio; no se arrastra automáticamente el efectivo del día anterior.

El cierre conserva el efectivo esperado, contado y los movimientos de ese momento. Bloquea nuevos movimientos manuales de ese día. Los pagos de pedidos pueden continuar; si hay cobros posteriores, la pantalla muestra una advertencia y conserva el cierre original. No permite editar ni borrar movimientos ni cierres.

Configuración guarda los datos del negocio en la base de datos. La apariencia es una preferencia del navegador. Los datos del negocio no sustituyen el logotipo ni cambian documentos existentes.

Validado con base de datos local de prueba: cobros, separación de métodos, reintentos, validaciones, cierre y control de rol. Validado en navegador con datos simulados en anchos 320, 390 y 1440 px. La activación y comprobación con datos reales están pendientes.
