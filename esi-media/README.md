# Frontend-ESI-MEDIA-G05

Este repositorio contiene la aplicación web (SPA) desarrollada con **Angular** y **Tailwind CSS** para la plataforma ESI Media. Gestiona la interfaz de usuario, paneles de administración, reproducción de multimedia y la interacción con la API REST.

## Stack Tecnológico

* **Framework:** Angular
* **Lenguaje:** TypeScript
* **Estilos:** Tailwind CSS

## Requisitos Previos

Asegúrate de tener instalado:
1.  **Node.js** (Versión LTS recomendada).
2.  **Angular CLI** (Instalado globalmente o accesible vía npm).

## Configuración del Entorno

El archivo principal de configuración se encuentra en `esi-media/src/environments/environment.ts` (para desarrollo) y `environment.production.ts` (para producción). Asegúrate de que la `apiUrl` apunte a tu backend.

## Ejecución del proyecto

Desde la carpeta `esi-media`:

```bash
npm install
ng serve
```

## Compilación del proyecto

```bash
npm build
```

## Estructura del proyecto

El proyecto sigue una estructura modular basada en componentes y servicios de Angular:

esi-media/src/app/
├── guards/             # Protecciones de rutas (AuthGuard, Roles)
├── model/              # Interfaces y modelos de datos (TypeScript)
├── services/           # Lógica de conexión con la API y gestión de estado
├── shared/             # Componentes reutilizables (Modales, Validadores)
├── environments/       # Configuración de variables de entorno (API URL)
└── [features]/         # Carpetas por funcionalidad principal:
    ├── login/          # Autenticación
    ├── home/           # Página de inicio
    ├── admin-dashboard/   # Panel de administración
    ├── gestor-dashboard/  # Panel para gestores de contenido
    ├── visu-dashboard/    # Panel para visualizadores
    └── ...