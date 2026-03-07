# Nombre de proyecto : Splitty

## Concepto general : 

La aplicación permite que un grupo de personas (amigos, roomies, viajeros) registre gastos comunes y que el sistema calcule automáticamente quién le debe a quién y cuánto, buscando siempre la "ruta mínima" de pagos para saldar las deudas. 

## ¿Cómo se vería el flujo? 

Frontend (React/Angular/Vue): El usuario llena un formulario: "Cena Pizza - $60 - Pagó: Tú - Dividir entre: Ana y Luis". 
Backend (Node/Python/Java): Recibe el dato, calcula que Ana debe 20 y Luis debe 20, y actualiza los balances generales del grupo. 
Base de Datos: Guarda el registro histórico para que nadie pueda decir "yo no sabía". 

### Funcionalidades : 

- Recordatorios: "Faltan 2 días para pagar el alquiler". 

## Modelo de datos:

Users: ID, nombre, email, avatar. 

Groups: ID, nombre, descripción. 

Expenses: ID, monto, descripción, pagado_por (User_ID), Group_ID. 

Debt_Splits: La tabla intermedia que conecta quién debe cuánto en cada gasto. 

## El Reto Técnico:

Lo más difícil y valioso de este proyecto es el Algoritmo de Simplificación de Deudas. 

Ejemplo: Si Ana le debe 10 a Beto, y Beto le debe 10 a Carlos, el sistema debe ser capaz de decir: "Ana le paga 10 directamente a Carlos" para evitar transacciones innecesarias. 

Implementar esta lógica en tu Backend demuestra que tienes capacidad de resolución de algoritmos complejos. 

## Diseño de Línea de Tiempo – Historias de Usuario (Splitty) 

### Línea de Tiempo del Desarrollo de Funcionalidades 

#### Fase 1: Creación y Organización Inicial 
##### 🟩 HU01 – Crear Grupo 
Tarjeta: 

Nombre del grupo 

Categoría 

Enlace de invitación 

Añadir miembros 

##### 🟩 HU02 – Añadir Gasto 
Tarjeta: 

Monto, descripción, quién pagó 

División automática 

Fecha editable 

#### Fase 2: Gestión de Evidencias y Visualización 
##### 🟦 HU03 – Adjuntar Recibo 
Tarjeta: 

Subida de JPG/PNG/PDF 

Visualización completa 

Almacenamiento en la nube 

##### 🟦 HU04 – Ver Saldos 
Tarjeta: 

Saldo total visible 

Colores (Rojo/Verde) 

Desglose por persona 

#### Fase 3: Personalización y Ajustes Financieros 
##### 🟨 HU05 – División Desigual 
Tarjeta: 

División por porcentaje, monto o partes 

Validación de suma total 

##### 🟨 HU06 – Registrar Pago 
Tarjeta: 

Selección de receptor 

Notificación push 

Actualización de saldo 

#### Fase 4: Optimización y Funcionalidades Avanzadas 
#### 🟧 HU07 – Simplificar Deudas 
Tarjeta: 

Algoritmo de liquidación cruzada 

Activar/desactivar por grupo 


#### 🟧 HU08 – Multimoneda 
Tarjeta: 

Selector de divisa 

API de tipo de cambio 

Conversión automática 

#### Fase 5: Control y Auditoría 
#### 🟥 HU09 – Historial/Log 
Tarjeta: 

Registro cronológico 

Usuario, acción y hora 

Opción de “Deshacer” 

Representación Visual (Esquema Lineal) 

### Inicio → [HU01] → [HU02] → [HU03] → [HU04] → [HU05] → [HU06] → [HU07] → [HU08] → [HU09] → Fin 



### Posibles APIS Externas: 

1. Gestión de Imágenes (Recibos y Avatares) 

Cloudinary (Recomendado): Es el estándar de oro para proyectos de grado. 

Por qué: Tiene un SDK oficial para Python que es extremadamente fácil de usar. Puedes subir la imagen directamente desde el frontend (React) o pasarla al backend y que Flask la suba. 

Función: Almacena los recibos de la HU03 y te devuelve una URL que guardas en tu base de datos. 

Firebase Storage: Otra opción sólida si ya usas Firebase para autenticación, aunque Cloudinary ofrece mejores herramientas para recortar o redimensionar fotos automáticamente. 

2. Conversión de Monedas (HU08) 

ExchangeRate-API: Es muy estable y tiene un plan gratuito generoso (1,500 peticiones al mes). 

Función: Te permite traer las tasas en tiempo real (ej. convertir de Pesos o Bolívares a USD) para que el balance del grupo sea coherente. 

Fixer.io: Muy profesional, aunque su plan gratuito es un poco más limitado en cuanto a la moneda base (a veces solo permite EUR en el plan free). 

3. Notificaciones y Tiempo Real (HU06) 

Pusher (Recomendado): Es perfecto para proyectos finales porque elimina la complejidad de configurar WebSockets manualmente. 

Función: Envía notificaciones instantáneas ("¡Juan registró un gasto!") que aparecen en la app sin que el usuario recargue la página. 

SendGrid o Brevo (Email): Para notificaciones por correo electrónico (como invitaciones al grupo). Brevo es excelente porque te permite enviar hasta 300 correos al día gratis. 

4. Pasarela de Pagos (Opcional pero Pro) 

Si quieren simular el pago real de la deuda: 

PayPal Sandbox: Es lo más universal para demostrar que sabes integrar un flujo de pago internacional. 

Stripe (Modo Test): Tiene la mejor documentación del mundo. Aunque en Venezuela tiene restricciones para cuentas reales, el Modo Test funciona perfecto para demostrar la integración en tu defensa de proyecto. 


¿Por dónde empezar? 

Mi consejo es que dividan el trabajo de inmediato: 

Backend: Alguien debe empezar a definir los modelos en SQLAlchemy y las rutas de auth (JWT). 

Frontend: Alguien debe maquetar el formulario de "Añadir Gasto", que es la parte más compleja de la UI por las divisiones desiguales. 





------------------------------------------------------------------------------------------------------------------------------------------


# Plantilla de WebApp con React JS y Flask API

Construye aplicaciones web usando React.js para el front end y python/flask para tu API backend.

- La documentación se puede encontrar aquí: https://4geeks.com/docs/start/react-flask-template
- Aquí hay un video sobre [cómo usar esta plantilla](https://www.youtube.com/watch?v=qBz6Ddd2m38)
- Integrado con Pipenv para la gestión de paquetes.
- Despliegue rápido a Render [en solo unos pocos pasos aquí](https://4geeks.com/es/docs/start/despliega-con-render-com).
- Uso del archivo .env.
- Integración de SQLAlchemy para la abstracción de bases de datos.

### 1) Instalación:

> Si usas Github Codespaces (recomendado) o Gitpod, esta plantilla ya vendrá con Python, Node y la base de datos Posgres instalados. Si estás trabajando localmente, asegúrate de instalar Python 3.10, Node.

Se recomienda instalar el backend primero, asegúrate de tener Python 3.10, Pipenv y un motor de base de datos (se recomienda Posgres).

1. Instala los paquetes de python: `$ pipenv install`
2. Crea un archivo .env basado en el .env.example: `$ cp .env.example .env`
3. Instala tu motor de base de datos y crea tu base de datos, dependiendo de tu base de datos, debes crear una variable DATABASE_URL con uno de los valores posibles, asegúrate de reemplazar los valores con la información de tu base de datos:

| Motor     | DATABASE_URL                                        |
| --------- | --------------------------------------------------- |
| SQLite    | sqlite:////test.db                                  |
| MySQL     | mysql://username:password@localhost:port/example    |
| Postgres  | postgres://username:password@localhost:5432/example |

4. Migra las migraciones: `$ pipenv run migrate` (omite si no has hecho cambios en los modelos en `./src/api/models.py`)
5. Ejecuta las migraciones: `$ pipenv run upgrade`
6. Ejecuta la aplicación: `$ pipenv run start`

> Nota: Los usuarios de Codespaces pueden conectarse a psql escribiendo: `psql -h localhost -U gitpod example`

### Deshacer una migración

También puedes deshacer una migración ejecutando

```sh
$ pipenv run downgrade
```

### Población de la tabla de usuarios en el backend

Para insertar usuarios de prueba en la base de datos, ejecuta el siguiente comando:

```sh
$ flask insert-test-users 5
```

Y verás el siguiente mensaje:

```
    Creating test users
    test_user1@test.com created.
    test_user2@test.com created.
    test_user3@test.com created.
    test_user4@test.com created.
    test_user5@test.com created.
    Users created successfully!
```

### **Nota importante para la base de datos y los datos dentro de ella**

Cada entorno de Github Codespace tendrá **su propia base de datos**, por lo que si estás trabajando con más personas, cada uno tendrá una base de datos diferente y diferentes registros dentro de ella. Estos datos **se perderán**, así que no pases demasiado tiempo creando registros manualmente para pruebas, en su lugar, puedes automatizar la adición de registros a tu base de datos editando el archivo ```commands.py``` dentro de la carpeta ```/src/api```. Edita la línea 32 de la función ```insert_test_data``` para insertar los datos según tu modelo (usa la función ```insert_test_users``` anterior como ejemplo). Luego, todo lo que necesitas hacer es ejecutar ```pipenv run insert-test-data```.

### Instalación manual del Front-End:

-   Asegúrate de estar usando la versión 20 de node y de que ya hayas instalado y ejecutado correctamente el backend.

1. Instala los paquetes: `$ npm install`
2. ¡Empieza a codificar! inicia el servidor de desarrollo de webpack `$ npm run start`

## ¡Publica tu sitio web!

Esta plantilla está 100% lista para desplegarse con Render.com y Heroku en cuestión de minutos. Por favor, lee la [documentación oficial al respecto](https://4geeks.com/docs/start/deploy-to-render-com).

### Contribuyentes

Esta plantilla fue construida como parte del [Coding Bootcamp](https://4geeksacademy.com/us/coding-bootcamp) de 4Geeks Academy por [Alejandro Sanchez](https://twitter.com/alesanchezr) y muchos otros contribuyentes. Descubre más sobre nuestro [Curso de Desarrollador Full Stack](https://4geeksacademy.com/us/coding-bootcamps/part-time-full-stack-developer) y [Bootcamp de Ciencia de Datos](https://4geeksacademy.com/us/coding-bootcamps/datascience-machine-learning).

Puedes encontrar otras plantillas y recursos como este en la [página de github de la escuela](https://github.com/4geeksacademy/).


