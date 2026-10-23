# Trabajos disponibles y WhatsApp

1. En el SQL Editor del mismo proyecto Supabase, ejecutar completo `activar-disenadores.sql`.
2. Esperar Success y recargar la aplicación.
3. Entrar con una cuenta de diseñador y pulsar Ver disponibles. Tomar trabajo lo asigna a esa cuenta y lo pasa a En diseño. No se muestran trabajos asignados a otros diseñadores.
4. El pedido asignado muestra el teléfono y Contactar al cliente por WhatsApp. Los móviles peruanos de nueve dígitos reciben el prefijo 51; otros números deben incluir su código de país.
5. Adjuntar el diseño y enviarlo desde WhatsApp. Después de la aprobación del cliente, marcar la casilla de confirmación y pulsar Marcar listo. La casilla es una declaración manual del diseñador, no una verificación automática de los mensajes de WhatsApp.
6. En la vista Listos, copiar el resumen del pedido y abrir el grupo para pegarlo y adjuntar el archivo aprobado. El panel no envía mensajes ni archivos automáticamente.
7. Administración puede guardar después el enlace de invitación del grupo en Configuración → WhatsApp · TRABAJOS LISTOS. Se admite `https://chat.whatsapp.com/...`. Abrir ese enlace no preselecciona un archivo ni publica el resumen.

Pruebas locales realizadas con datos simulados: exclusividad de la asignación, reintentos, control de rol, teléfonos, validación del enlace, navegación y flujo de confirmación. Falta ejecutar la actualización en la base de datos real.
