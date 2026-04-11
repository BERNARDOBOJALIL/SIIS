# Analisis detallado de fallos

Fecha: 2026-04-11
Fuente principal: reports/qa-evidence/01-lint.log
Anexo estructurado: reports/qa-evidence/07a-lint-fallos-detalle.csv

## Resumen

- Hallazgos parseados con ubicacion exacta: 1103
- Errores: 1101
- Warnings: 2

Nota: el log global reporta 1108 problemas; el parser extrae las entradas con formato archivo-linea-columna.

## Top archivos con mas fallos

| Archivo | Cantidad |
|---|---:|
| C:\Users\Windows\Desktop\ASE\SIIS\public\draco\draco_decoder.js | 1042 |
| C:\Users\Windows\Desktop\ASE\SIIS\public\draco\draco_wasm_wrapper.js | 27 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx | 9 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx | 9 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\chatService.test.js | 5 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\http.test.js | 4 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\navPathfinding.js | 2 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\layout\MainLayout.jsx | 1 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\context\AuthContext.jsx | 1 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\layout\Navbar.jsx | 1 |

## Top reglas que mas fallan

| Regla | Cantidad |
|---|---:|
| no-constant-condition | 961 |
| no-unused-vars | 77 |
| no-undef | 39 |
| no-fallthrough | 15 |
| no-empty | 4 |
| no-useless-escape | 3 |
| react-hooks/exhaustive-deps | 2 |
| react-refresh/only-export-components | 2 |

## Donde fallo exactamente

Formato: Archivo, linea, columna, severidad, regla, motivo

### C:\Users\Windows\Desktop\ASE\SIIS\public\draco\draco_decoder.js

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 4 | 69 | error | no-undef | '__filename' is not defined |
| 8 | 1267 | error | no-undef | 'process' is not defined |
| 8 | 1302 | error | no-undef | 'process' is not defined |
| 8 | 1680 | error | no-undef | 'require' is not defined |
| 8 | 1707 | error | no-undef | 'require' is not defined |
| 8 | 1824 | error | no-undef | '__dirname' is not defined |
| 8 | 2439 | error | no-undef | 'process' is not defined |
| 8 | 2477 | error | no-undef | 'process' is not defined |
| 8 | 2526 | error | no-undef | 'process' is not defined |
| 8 | 2599 | error | no-undef | 'process' is not defined |
| 8 | 2668 | error | no-undef | 'process' is not defined |
| 8 | 3965 | error | no-unused-vars | 'setWindowTitle' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 8 | 4012 | error | no-empty | Empty block statement |
| 8 | 4202 | error | no-unused-vars | 'arguments_' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 8 | 4258 | error | no-unused-vars | 'thisProgram' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 8 | 4310 | error | no-unused-vars | 'quit_' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 8 | 4557 | error | no-unused-vars | 'binary' is defined but never used |
| 10 | 480 | error | no-unused-vars | 'q' is defined but never used |
| 10 | 20034 | error | no-unused-vars | 'u' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 12 | 1508 | error | no-constant-condition | Unexpected constant condition |
| 12 | 3292 | error | no-constant-condition | Unexpected constant condition |
| 12 | 3767 | error | no-constant-condition | Unexpected constant condition |
| 12 | 4191 | error | no-constant-condition | Unexpected constant condition |
| 12 | 5075 | error | no-constant-condition | Unexpected constant condition |
| 12 | 6121 | error | no-constant-condition | Unexpected constant condition |
| 12 | 6199 | error | no-constant-condition | Unexpected constant condition |
| 12 | 6905 | error | no-constant-condition | Unexpected constant condition |
| 12 | 7043 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 7120 | error | no-constant-condition | Unexpected constant condition |
| 12 | 8888 | error | no-constant-condition | Unexpected constant condition |
| 12 | 9367 | error | no-constant-condition | Unexpected constant condition |
| 12 | 9791 | error | no-constant-condition | Unexpected constant condition |
| 12 | 10631 | error | no-constant-condition | Unexpected constant condition |
| 12 | 11694 | error | no-constant-condition | Unexpected constant condition |
| 12 | 11772 | error | no-constant-condition | Unexpected constant condition |
| 12 | 12478 | error | no-constant-condition | Unexpected constant condition |
| 12 | 12616 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 12693 | error | no-constant-condition | Unexpected constant condition |
| 12 | 14474 | error | no-constant-condition | Unexpected constant condition |
| 12 | 14946 | error | no-constant-condition | Unexpected constant condition |
| 12 | 15370 | error | no-constant-condition | Unexpected constant condition |
| 12 | 16218 | error | no-constant-condition | Unexpected constant condition |
| 12 | 16983 | error | no-constant-condition | Unexpected constant condition |
| 12 | 17061 | error | no-constant-condition | Unexpected constant condition |
| 12 | 17767 | error | no-constant-condition | Unexpected constant condition |
| 12 | 17906 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 17986 | error | no-constant-condition | Unexpected constant condition |
| 12 | 19776 | error | no-constant-condition | Unexpected constant condition |
| 12 | 20256 | error | no-constant-condition | Unexpected constant condition |
| 12 | 20682 | error | no-constant-condition | Unexpected constant condition |
| 12 | 21512 | error | no-constant-condition | Unexpected constant condition |
| 12 | 22291 | error | no-constant-condition | Unexpected constant condition |
| 12 | 22369 | error | no-constant-condition | Unexpected constant condition |
| 12 | 23081 | error | no-constant-condition | Unexpected constant condition |
| 12 | 23220 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 23300 | error | no-constant-condition | Unexpected constant condition |
| 12 | 25099 | error | no-constant-condition | Unexpected constant condition |
| 12 | 25579 | error | no-constant-condition | Unexpected constant condition |
| 12 | 26005 | error | no-constant-condition | Unexpected constant condition |
| 12 | 26570 | error | no-constant-condition | Unexpected constant condition |
| 12 | 26686 | error | no-constant-condition | Unexpected constant condition |
| 12 | 27750 | error | no-constant-condition | Unexpected constant condition |
| 12 | 27830 | error | no-constant-condition | Unexpected constant condition |
| 12 | 28551 | error | no-constant-condition | Unexpected constant condition |
| 12 | 28690 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 28770 | error | no-constant-condition | Unexpected constant condition |
| 12 | 30569 | error | no-constant-condition | Unexpected constant condition |
| 12 | 31053 | error | no-constant-condition | Unexpected constant condition |
| 12 | 31479 | error | no-constant-condition | Unexpected constant condition |
| 12 | 32000 | error | no-constant-condition | Unexpected constant condition |
| 12 | 32116 | error | no-constant-condition | Unexpected constant condition |
| 12 | 33190 | error | no-constant-condition | Unexpected constant condition |
| 12 | 33270 | error | no-constant-condition | Unexpected constant condition |
| 12 | 33991 | error | no-constant-condition | Unexpected constant condition |
| 12 | 34130 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 34210 | error | no-constant-condition | Unexpected constant condition |
| 12 | 36034 | error | no-constant-condition | Unexpected constant condition |
| 12 | 36485 | error | no-constant-condition | Unexpected constant condition |
| 12 | 36911 | error | no-constant-condition | Unexpected constant condition |
| 12 | 37476 | error | no-constant-condition | Unexpected constant condition |
| 12 | 37592 | error | no-constant-condition | Unexpected constant condition |
| 12 | 38656 | error | no-constant-condition | Unexpected constant condition |
| 12 | 38736 | error | no-constant-condition | Unexpected constant condition |
| 12 | 39457 | error | no-constant-condition | Unexpected constant condition |
| 12 | 39596 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 39676 | error | no-constant-condition | Unexpected constant condition |
| 12 | 40620 | error | no-constant-condition | Unexpected constant condition |
| 12 | 40656 | error | no-constant-condition | Unexpected constant condition |
| 12 | 41005 | error | no-constant-condition | Unexpected constant condition |
| 12 | 41043 | error | no-constant-condition | Unexpected constant condition |
| 12 | 42935 | error | no-constant-condition | Unexpected constant condition |
| 12 | 43234 | error | no-constant-condition | Unexpected constant condition |
| 12 | 43764 | error | no-constant-condition | Unexpected constant condition |
| 12 | 43920 | error | no-constant-condition | Unexpected constant condition |
| 12 | 44018 | error | no-constant-condition | Unexpected constant condition |
| 12 | 45443 | error | no-constant-condition | Unexpected constant condition |
| 12 | 45479 | error | no-constant-condition | Unexpected constant condition |
| 12 | 46799 | error | no-constant-condition | Unexpected constant condition |
| 12 | 47098 | error | no-constant-condition | Unexpected constant condition |
| 12 | 47632 | error | no-constant-condition | Unexpected constant condition |
| 12 | 47789 | error | no-constant-condition | Unexpected constant condition |
| 12 | 47887 | error | no-constant-condition | Unexpected constant condition |
| 12 | 49315 | error | no-constant-condition | Unexpected constant condition |
| 12 | 49352 | error | no-constant-condition | Unexpected constant condition |
| 12 | 50675 | error | no-constant-condition | Unexpected constant condition |
| 12 | 50978 | error | no-constant-condition | Unexpected constant condition |
| 12 | 51512 | error | no-constant-condition | Unexpected constant condition |
| 12 | 51669 | error | no-constant-condition | Unexpected constant condition |
| 12 | 51767 | error | no-constant-condition | Unexpected constant condition |
| 12 | 53210 | error | no-constant-condition | Unexpected constant condition |
| 12 | 53249 | error | no-constant-condition | Unexpected constant condition |
| 12 | 54589 | error | no-constant-condition | Unexpected constant condition |
| 12 | 54898 | error | no-constant-condition | Unexpected constant condition |
| 12 | 55445 | error | no-constant-condition | Unexpected constant condition |
| 12 | 55606 | error | no-constant-condition | Unexpected constant condition |
| 12 | 55705 | error | no-constant-condition | Unexpected constant condition |
| 12 | 57161 | error | no-constant-condition | Unexpected constant condition |
| 12 | 57201 | error | no-constant-condition | Unexpected constant condition |
| 12 | 58539 | error | no-constant-condition | Unexpected constant condition |
| 12 | 58848 | error | no-constant-condition | Unexpected constant condition |
| 12 | 59393 | error | no-constant-condition | Unexpected constant condition |
| 12 | 59554 | error | no-constant-condition | Unexpected constant condition |
| 12 | 59653 | error | no-constant-condition | Unexpected constant condition |
| 12 | 61103 | error | no-constant-condition | Unexpected constant condition |
| 12 | 61143 | error | no-constant-condition | Unexpected constant condition |
| 12 | 61977 | error | no-constant-condition | Unexpected constant condition |
| 12 | 62015 | error | no-constant-condition | Unexpected constant condition |
| 12 | 62732 | error | no-constant-condition | Unexpected constant condition |
| 12 | 62853 | error | no-constant-condition | Unexpected constant condition |
| 12 | 63040 | error | no-constant-condition | Unexpected constant condition |
| 12 | 69635 | error | no-constant-condition | Unexpected constant condition |
| 12 | 69865 | error | no-constant-condition | Unexpected constant condition |
| 12 | 70107 | error | no-constant-condition | Unexpected constant condition |
| 12 | 70428 | error | no-constant-condition | Unexpected constant condition |
| 12 | 71134 | error | no-constant-condition | Unexpected constant condition |
| 12 | 73862 | error | no-constant-condition | Unexpected constant condition |
| 12 | 74016 | error | no-constant-condition | Unexpected constant condition |
| 12 | 74487 | error | no-constant-condition | Unexpected constant condition |
| 12 | 75805 | error | no-constant-condition | Unexpected constant condition |
| 12 | 76430 | error | no-constant-condition | Unexpected constant condition |
| 12 | 77480 | error | no-constant-condition | Unexpected constant condition |
| 12 | 78031 | error | no-constant-condition | Unexpected constant condition |
| 12 | 78350 | error | no-constant-condition | Unexpected constant condition |
| 12 | 79133 | error | no-constant-condition | Unexpected constant condition |
| 12 | 80753 | error | no-constant-condition | Unexpected constant condition |
| 12 | 80822 | error | no-constant-condition | Unexpected constant condition |
| 12 | 80979 | error | no-constant-condition | Unexpected constant condition |
| 12 | 81440 | error | no-constant-condition | Unexpected constant condition |
| 12 | 82099 | error | no-constant-condition | Unexpected constant condition |
| 12 | 82207 | error | no-constant-condition | Unexpected constant condition |
| 12 | 82362 | error | no-constant-condition | Unexpected constant condition |
| 12 | 82471 | error | no-constant-condition | Unexpected constant condition |
| 12 | 82753 | error | no-constant-condition | Unexpected constant condition |
| 12 | 83238 | error | no-constant-condition | Unexpected constant condition |
| 12 | 83359 | error | no-constant-condition | Unexpected constant condition |
| 12 | 83546 | error | no-constant-condition | Unexpected constant condition |
| 12 | 87651 | error | no-constant-condition | Unexpected constant condition |
| 12 | 90199 | error | no-constant-condition | Unexpected constant condition |
| 12 | 90350 | error | no-constant-condition | Unexpected constant condition |
| 12 | 90818 | error | no-constant-condition | Unexpected constant condition |
| 12 | 92132 | error | no-constant-condition | Unexpected constant condition |
| 12 | 92752 | error | no-constant-condition | Unexpected constant condition |
| 12 | 93828 | error | no-constant-condition | Unexpected constant condition |
| 12 | 94383 | error | no-constant-condition | Unexpected constant condition |
| 12 | 94702 | error | no-constant-condition | Unexpected constant condition |
| 12 | 95504 | error | no-constant-condition | Unexpected constant condition |
| 12 | 97144 | error | no-constant-condition | Unexpected constant condition |
| 12 | 97213 | error | no-constant-condition | Unexpected constant condition |
| 12 | 97370 | error | no-constant-condition | Unexpected constant condition |
| 12 | 97831 | error | no-constant-condition | Unexpected constant condition |
| 12 | 98503 | error | no-constant-condition | Unexpected constant condition |
| 12 | 98611 | error | no-constant-condition | Unexpected constant condition |
| 12 | 98766 | error | no-constant-condition | Unexpected constant condition |
| 12 | 98875 | error | no-constant-condition | Unexpected constant condition |
| 12 | 99157 | error | no-constant-condition | Unexpected constant condition |
| 12 | 99625 | error | no-constant-condition | Unexpected constant condition |
| 12 | 99746 | error | no-constant-condition | Unexpected constant condition |
| 12 | 99933 | error | no-constant-condition | Unexpected constant condition |
| 12 | 103765 | error | no-constant-condition | Unexpected constant condition |
| 12 | 106220 | error | no-constant-condition | Unexpected constant condition |
| 12 | 106371 | error | no-constant-condition | Unexpected constant condition |
| 12 | 106839 | error | no-constant-condition | Unexpected constant condition |
| 12 | 108121 | error | no-constant-condition | Unexpected constant condition |
| 12 | 108806 | error | no-constant-condition | Unexpected constant condition |
| 12 | 109741 | error | no-constant-condition | Unexpected constant condition |
| 12 | 110296 | error | no-constant-condition | Unexpected constant condition |
| 12 | 110607 | error | no-constant-condition | Unexpected constant condition |
| 12 | 111409 | error | no-constant-condition | Unexpected constant condition |
| 12 | 113049 | error | no-constant-condition | Unexpected constant condition |
| 12 | 113118 | error | no-constant-condition | Unexpected constant condition |
| 12 | 113275 | error | no-constant-condition | Unexpected constant condition |
| 12 | 113736 | error | no-constant-condition | Unexpected constant condition |
| 12 | 114412 | error | no-constant-condition | Unexpected constant condition |
| 12 | 114520 | error | no-constant-condition | Unexpected constant condition |
| 12 | 114675 | error | no-constant-condition | Unexpected constant condition |
| 12 | 114784 | error | no-constant-condition | Unexpected constant condition |
| 12 | 115066 | error | no-constant-condition | Unexpected constant condition |
| 12 | 116081 | error | no-constant-condition | Unexpected constant condition |
| 12 | 116466 | error | no-constant-condition | Unexpected constant condition |
| 12 | 117103 | error | no-constant-condition | Unexpected constant condition |
| 12 | 117858 | error | no-constant-condition | Unexpected constant condition |
| 12 | 118499 | error | no-constant-condition | Unexpected constant condition |
| 12 | 118710 | error | no-constant-condition | Unexpected constant condition |
| 12 | 118848 | error | no-constant-condition | Unexpected constant condition |
| 12 | 119182 | error | no-constant-condition | Unexpected constant condition |
| 12 | 119342 | error | no-constant-condition | Unexpected constant condition |
| 12 | 119677 | error | no-constant-condition | Unexpected constant condition |
| 12 | 120225 | error | no-constant-condition | Unexpected constant condition |
| 12 | 120270 | error | no-constant-condition | Unexpected constant condition |
| 12 | 120378 | error | no-constant-condition | Unexpected constant condition |
| 12 | 120618 | error | no-constant-condition | Unexpected constant condition |
| 12 | 120853 | error | no-constant-condition | Unexpected constant condition |
| 12 | 121031 | error | no-constant-condition | Unexpected constant condition |
| 12 | 121449 | error | no-constant-condition | Unexpected constant condition |
| 12 | 122694 | error | no-constant-condition | Unexpected constant condition |
| 12 | 122875 | error | no-constant-condition | Unexpected constant condition |
| 12 | 123304 | error | no-constant-condition | Unexpected constant condition |
| 12 | 123743 | error | no-constant-condition | Unexpected constant condition |
| 12 | 124277 | error | no-constant-condition | Unexpected constant condition |
| 12 | 124781 | error | no-constant-condition | Unexpected constant condition |
| 12 | 125234 | error | no-constant-condition | Unexpected constant condition |
| 12 | 125757 | error | no-constant-condition | Unexpected constant condition |
| 12 | 126504 | error | no-constant-condition | Unexpected constant condition |
| 12 | 128420 | error | no-constant-condition | Unexpected constant condition |
| 12 | 128717 | error | no-constant-condition | Unexpected constant condition |
| 12 | 129029 | error | no-constant-condition | Unexpected constant condition |
| 12 | 129297 | error | no-constant-condition | Unexpected constant condition |
| 12 | 129444 | error | no-constant-condition | Unexpected constant condition |
| 12 | 129938 | error | no-constant-condition | Unexpected constant condition |
| 12 | 130083 | error | no-constant-condition | Unexpected constant condition |
| 12 | 130272 | error | no-constant-condition | Unexpected constant condition |
| 12 | 130563 | error | no-constant-condition | Unexpected constant condition |
| 12 | 130827 | error | no-constant-condition | Unexpected constant condition |
| 12 | 130970 | error | no-constant-condition | Unexpected constant condition |
| 12 | 131473 | error | no-constant-condition | Unexpected constant condition |
| 12 | 131614 | error | no-constant-condition | Unexpected constant condition |
| 12 | 131791 | error | no-constant-condition | Unexpected constant condition |
| 12 | 132078 | error | no-constant-condition | Unexpected constant condition |
| 12 | 132350 | error | no-constant-condition | Unexpected constant condition |
| 12 | 132493 | error | no-constant-condition | Unexpected constant condition |
| 12 | 132900 | error | no-constant-condition | Unexpected constant condition |
| 12 | 133197 | error | no-constant-condition | Unexpected constant condition |
| 12 | 133509 | error | no-constant-condition | Unexpected constant condition |
| 12 | 133777 | error | no-constant-condition | Unexpected constant condition |
| 12 | 133924 | error | no-constant-condition | Unexpected constant condition |
| 12 | 134418 | error | no-constant-condition | Unexpected constant condition |
| 12 | 134563 | error | no-constant-condition | Unexpected constant condition |
| 12 | 134752 | error | no-constant-condition | Unexpected constant condition |
| 12 | 135043 | error | no-constant-condition | Unexpected constant condition |
| 12 | 135307 | error | no-constant-condition | Unexpected constant condition |
| 12 | 135450 | error | no-constant-condition | Unexpected constant condition |
| 12 | 135953 | error | no-constant-condition | Unexpected constant condition |
| 12 | 136094 | error | no-constant-condition | Unexpected constant condition |
| 12 | 136271 | error | no-constant-condition | Unexpected constant condition |
| 12 | 136558 | error | no-constant-condition | Unexpected constant condition |
| 12 | 136830 | error | no-constant-condition | Unexpected constant condition |
| 12 | 136973 | error | no-constant-condition | Unexpected constant condition |
| 12 | 137310 | error | no-constant-condition | Unexpected constant condition |
| 12 | 137422 | error | no-constant-condition | Unexpected constant condition |
| 12 | 137779 | error | no-constant-condition | Unexpected constant condition |
| 12 | 137967 | error | no-constant-condition | Unexpected constant condition |
| 12 | 138250 | error | no-constant-condition | Unexpected constant condition |
| 12 | 138522 | error | no-constant-condition | Unexpected constant condition |
| 12 | 138669 | error | no-constant-condition | Unexpected constant condition |
| 12 | 139937 | error | no-constant-condition | Unexpected constant condition |
| 12 | 140465 | error | no-constant-condition | Unexpected constant condition |
| 12 | 140994 | error | no-constant-condition | Unexpected constant condition |
| 12 | 141694 | error | no-constant-condition | Unexpected constant condition |
| 12 | 142327 | error | no-constant-condition | Unexpected constant condition |
| 12 | 143097 | error | no-constant-condition | Unexpected constant condition |
| 12 | 144129 | error | no-constant-condition | Unexpected constant condition |
| 12 | 144657 | error | no-constant-condition | Unexpected constant condition |
| 12 | 145186 | error | no-constant-condition | Unexpected constant condition |
| 12 | 145886 | error | no-constant-condition | Unexpected constant condition |
| 12 | 146519 | error | no-constant-condition | Unexpected constant condition |
| 12 | 147289 | error | no-constant-condition | Unexpected constant condition |
| 12 | 148237 | error | no-constant-condition | Unexpected constant condition |
| 12 | 149350 | error | no-constant-condition | Unexpected constant condition |
| 12 | 149632 | error | no-constant-condition | Unexpected constant condition |
| 12 | 150019 | error | no-constant-condition | Unexpected constant condition |
| 12 | 150302 | error | no-constant-condition | Unexpected constant condition |
| 12 | 150612 | error | no-constant-condition | Unexpected constant condition |
| 12 | 151365 | error | no-constant-condition | Unexpected constant condition |
| 12 | 152090 | error | no-constant-condition | Unexpected constant condition |
| 12 | 152294 | error | no-constant-condition | Unexpected constant condition |
| 12 | 152783 | error | no-constant-condition | Unexpected constant condition |
| 12 | 152888 | error | no-constant-condition | Unexpected constant condition |
| 12 | 153604 | error | no-constant-condition | Unexpected constant condition |
| 12 | 154467 | error | no-constant-condition | Unexpected constant condition |
| 12 | 154947 | error | no-constant-condition | Unexpected constant condition |
| 12 | 155488 | error | no-constant-condition | Unexpected constant condition |
| 12 | 156769 | error | no-constant-condition | Unexpected constant condition |
| 12 | 157841 | error | no-constant-condition | Unexpected constant condition |
| 12 | 158705 | error | no-constant-condition | Unexpected constant condition |
| 12 | 159731 | error | no-constant-condition | Unexpected constant condition |
| 12 | 160893 | error | no-constant-condition | Unexpected constant condition |
| 12 | 160964 | error | no-constant-condition | Unexpected constant condition |
| 12 | 161129 | error | no-constant-condition | Unexpected constant condition |
| 12 | 161590 | error | no-constant-condition | Unexpected constant condition |
| 12 | 163797 | error | no-constant-condition | Unexpected constant condition |
| 12 | 165015 | error | no-constant-condition | Unexpected constant condition |
| 12 | 165790 | error | no-constant-condition | Unexpected constant condition |
| 12 | 167738 | error | no-constant-condition | Unexpected constant condition |
| 12 | 168281 | error | no-constant-condition | Unexpected constant condition |
| 12 | 168437 | error | no-constant-condition | Unexpected constant condition |
| 12 | 168743 | error | no-constant-condition | Unexpected constant condition |
| 12 | 169270 | error | no-constant-condition | Unexpected constant condition |
| 12 | 171195 | error | no-constant-condition | Unexpected constant condition |
| 12 | 172016 | error | no-constant-condition | Unexpected constant condition |
| 12 | 172854 | error | no-constant-condition | Unexpected constant condition |
| 12 | 176597 | error | no-constant-condition | Unexpected constant condition |
| 12 | 177259 | error | no-constant-condition | Unexpected constant condition |
| 12 | 177436 | error | no-constant-condition | Unexpected constant condition |
| 12 | 181138 | error | no-constant-condition | Unexpected constant condition |
| 12 | 181468 | error | no-constant-condition | Unexpected constant condition |
| 12 | 181744 | error | no-constant-condition | Unexpected constant condition |
| 12 | 182170 | error | no-constant-condition | Unexpected constant condition |
| 12 | 182245 | error | no-constant-condition | Unexpected constant condition |
| 12 | 182648 | error | no-constant-condition | Unexpected constant condition |
| 12 | 183129 | error | no-constant-condition | Unexpected constant condition |
| 12 | 183204 | error | no-constant-condition | Unexpected constant condition |
| 12 | 183588 | error | no-constant-condition | Unexpected constant condition |
| 12 | 184507 | error | no-constant-condition | Unexpected constant condition |
| 12 | 184554 | error | no-constant-condition | Unexpected constant condition |
| 12 | 185414 | error | no-constant-condition | Unexpected constant condition |
| 12 | 185680 | error | no-constant-condition | Unexpected constant condition |
| 12 | 188253 | error | no-constant-condition | Unexpected constant condition |
| 12 | 188833 | error | no-constant-condition | Unexpected constant condition |
| 12 | 188886 | error | no-constant-condition | Unexpected constant condition |
| 12 | 189115 | error | no-constant-condition | Unexpected constant condition |
| 12 | 190075 | error | no-constant-condition | Unexpected constant condition |
| 12 | 191125 | error | no-constant-condition | Unexpected constant condition |
| 12 | 191203 | error | no-constant-condition | Unexpected constant condition |
| 12 | 191801 | error | no-constant-condition | Unexpected constant condition |
| 12 | 192029 | error | no-constant-condition | Unexpected constant condition |
| 12 | 192437 | error | no-constant-condition | Unexpected constant condition |
| 12 | 192575 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 192652 | error | no-constant-condition | Unexpected constant condition |
| 12 | 194532 | error | no-constant-condition | Unexpected constant condition |
| 12 | 195120 | error | no-constant-condition | Unexpected constant condition |
| 12 | 195173 | error | no-constant-condition | Unexpected constant condition |
| 12 | 195402 | error | no-constant-condition | Unexpected constant condition |
| 12 | 196318 | error | no-constant-condition | Unexpected constant condition |
| 12 | 197382 | error | no-constant-condition | Unexpected constant condition |
| 12 | 197460 | error | no-constant-condition | Unexpected constant condition |
| 12 | 198058 | error | no-constant-condition | Unexpected constant condition |
| 12 | 198286 | error | no-constant-condition | Unexpected constant condition |
| 12 | 198694 | error | no-constant-condition | Unexpected constant condition |
| 12 | 198832 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 198909 | error | no-constant-condition | Unexpected constant condition |
| 12 | 200806 | error | no-constant-condition | Unexpected constant condition |
| 12 | 201311 | error | no-constant-condition | Unexpected constant condition |
| 12 | 201364 | error | no-constant-condition | Unexpected constant condition |
| 12 | 201593 | error | no-constant-condition | Unexpected constant condition |
| 12 | 202225 | error | no-constant-condition | Unexpected constant condition |
| 12 | 202343 | error | no-constant-condition | Unexpected constant condition |
| 12 | 203403 | error | no-constant-condition | Unexpected constant condition |
| 12 | 203483 | error | no-constant-condition | Unexpected constant condition |
| 12 | 204090 | error | no-constant-condition | Unexpected constant condition |
| 12 | 204319 | error | no-constant-condition | Unexpected constant condition |
| 12 | 204727 | error | no-constant-condition | Unexpected constant condition |
| 12 | 204865 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 204942 | error | no-constant-condition | Unexpected constant condition |
| 12 | 206838 | error | no-constant-condition | Unexpected constant condition |
| 12 | 207314 | error | no-constant-condition | Unexpected constant condition |
| 12 | 207367 | error | no-constant-condition | Unexpected constant condition |
| 12 | 207596 | error | no-constant-condition | Unexpected constant condition |
| 12 | 208228 | error | no-constant-condition | Unexpected constant condition |
| 12 | 208346 | error | no-constant-condition | Unexpected constant condition |
| 12 | 209406 | error | no-constant-condition | Unexpected constant condition |
| 12 | 209486 | error | no-constant-condition | Unexpected constant condition |
| 12 | 210093 | error | no-constant-condition | Unexpected constant condition |
| 12 | 210322 | error | no-constant-condition | Unexpected constant condition |
| 12 | 210730 | error | no-constant-condition | Unexpected constant condition |
| 12 | 210868 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 210945 | error | no-constant-condition | Unexpected constant condition |
| 12 | 212833 | error | no-constant-condition | Unexpected constant condition |
| 12 | 213346 | error | no-constant-condition | Unexpected constant condition |
| 12 | 213399 | error | no-constant-condition | Unexpected constant condition |
| 12 | 213628 | error | no-constant-condition | Unexpected constant condition |
| 12 | 214216 | error | no-constant-condition | Unexpected constant condition |
| 12 | 214334 | error | no-constant-condition | Unexpected constant condition |
| 12 | 215408 | error | no-constant-condition | Unexpected constant condition |
| 12 | 215488 | error | no-constant-condition | Unexpected constant condition |
| 12 | 216095 | error | no-constant-condition | Unexpected constant condition |
| 12 | 216324 | error | no-constant-condition | Unexpected constant condition |
| 12 | 216732 | error | no-constant-condition | Unexpected constant condition |
| 12 | 216870 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 216947 | error | no-constant-condition | Unexpected constant condition |
| 12 | 218844 | error | no-constant-condition | Unexpected constant condition |
| 12 | 219421 | error | no-constant-condition | Unexpected constant condition |
| 12 | 219474 | error | no-constant-condition | Unexpected constant condition |
| 12 | 219703 | error | no-constant-condition | Unexpected constant condition |
| 12 | 220628 | error | no-constant-condition | Unexpected constant condition |
| 12 | 221397 | error | no-constant-condition | Unexpected constant condition |
| 12 | 221475 | error | no-constant-condition | Unexpected constant condition |
| 12 | 222073 | error | no-constant-condition | Unexpected constant condition |
| 12 | 222301 | error | no-constant-condition | Unexpected constant condition |
| 12 | 222709 | error | no-constant-condition | Unexpected constant condition |
| 12 | 222847 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 222924 | error | no-constant-condition | Unexpected constant condition |
| 12 | 224817 | error | no-constant-condition | Unexpected constant condition |
| 12 | 225398 | error | no-constant-condition | Unexpected constant condition |
| 12 | 225451 | error | no-constant-condition | Unexpected constant condition |
| 12 | 225680 | error | no-constant-condition | Unexpected constant condition |
| 12 | 226569 | error | no-constant-condition | Unexpected constant condition |
| 12 | 227344 | error | no-constant-condition | Unexpected constant condition |
| 12 | 227422 | error | no-constant-condition | Unexpected constant condition |
| 12 | 228020 | error | no-constant-condition | Unexpected constant condition |
| 12 | 228248 | error | no-constant-condition | Unexpected constant condition |
| 12 | 228656 | error | no-constant-condition | Unexpected constant condition |
| 12 | 228794 | error | no-fallthrough | Expected a 'break' statement before 'case' |
| 12 | 228871 | error | no-constant-condition | Unexpected constant condition |
| 12 | 229497 | error | no-constant-condition | Unexpected constant condition |
| 12 | 229656 | error | no-constant-condition | Unexpected constant condition |
| 12 | 230243 | error | no-constant-condition | Unexpected constant condition |
| 12 | 230389 | error | no-constant-condition | Unexpected constant condition |
| 12 | 230745 | error | no-constant-condition | Unexpected constant condition |
| 12 | 231150 | error | no-constant-condition | Unexpected constant condition |
| 12 | 231807 | error | no-constant-condition | Unexpected constant condition |
| 12 | 232058 | error | no-constant-condition | Unexpected constant condition |
| 12 | 232345 | error | no-constant-condition | Unexpected constant condition |
| 12 | 233249 | error | no-constant-condition | Unexpected constant condition |
| 12 | 233356 | error | no-constant-condition | Unexpected constant condition |
| 12 | 234367 | error | no-constant-condition | Unexpected constant condition |
| 12 | 235980 | error | no-constant-condition | Unexpected constant condition |
| 12 | 236201 | error | no-constant-condition | Unexpected constant condition |
| 12 | 236776 | error | no-constant-condition | Unexpected constant condition |
| 12 | 236970 | error | no-constant-condition | Unexpected constant condition |
| 12 | 237402 | error | no-constant-condition | Unexpected constant condition |
| 12 | 238441 | error | no-constant-condition | Unexpected constant condition |
| 12 | 238620 | error | no-constant-condition | Unexpected constant condition |
| 12 | 238855 | error | no-constant-condition | Unexpected constant condition |
| 12 | 239133 | error | no-constant-condition | Unexpected constant condition |
| 12 | 239377 | error | no-constant-condition | Unexpected constant condition |
| 12 | 239598 | error | no-constant-condition | Unexpected constant condition |
| 12 | 239816 | error | no-constant-condition | Unexpected constant condition |
| 12 | 240060 | error | no-constant-condition | Unexpected constant condition |
| 12 | 241694 | error | no-constant-condition | Unexpected constant condition |
| 12 | 241915 | error | no-constant-condition | Unexpected constant condition |
| 12 | 242490 | error | no-constant-condition | Unexpected constant condition |
| 12 | 242667 | error | no-constant-condition | Unexpected constant condition |
| 12 | 243124 | error | no-constant-condition | Unexpected constant condition |
| 12 | 244021 | error | no-constant-condition | Unexpected constant condition |
| 12 | 244200 | error | no-constant-condition | Unexpected constant condition |
| 12 | 244435 | error | no-constant-condition | Unexpected constant condition |
| 12 | 244713 | error | no-constant-condition | Unexpected constant condition |
| 12 | 244957 | error | no-constant-condition | Unexpected constant condition |
| 12 | 245178 | error | no-constant-condition | Unexpected constant condition |
| 12 | 245396 | error | no-constant-condition | Unexpected constant condition |
| 12 | 245640 | error | no-constant-condition | Unexpected constant condition |
| 12 | 246288 | error | no-constant-condition | Unexpected constant condition |
| 12 | 246370 | error | no-constant-condition | Unexpected constant condition |
| 12 | 246438 | error | no-constant-condition | Unexpected constant condition |
| 12 | 246808 | error | no-constant-condition | Unexpected constant condition |
| 12 | 247612 | error | no-constant-condition | Unexpected constant condition |
| 12 | 249050 | error | no-constant-condition | Unexpected constant condition |
| 12 | 249289 | error | no-constant-condition | Unexpected constant condition |
| 12 | 249639 | error | no-constant-condition | Unexpected constant condition |
| 12 | 249759 | error | no-constant-condition | Unexpected constant condition |
| 12 | 250105 | error | no-constant-condition | Unexpected constant condition |
| 12 | 250240 | error | no-constant-condition | Unexpected constant condition |
| 12 | 250361 | error | no-constant-condition | Unexpected constant condition |
| 12 | 250637 | error | no-constant-condition | Unexpected constant condition |
| 12 | 250864 | error | no-constant-condition | Unexpected constant condition |
| 12 | 251178 | error | no-constant-condition | Unexpected constant condition |
| 12 | 251304 | error | no-constant-condition | Unexpected constant condition |
| 12 | 252183 | error | no-constant-condition | Unexpected constant condition |
| 12 | 255469 | error | no-constant-condition | Unexpected constant condition |
| 12 | 255760 | error | no-constant-condition | Unexpected constant condition |
| 12 | 256510 | error | no-constant-condition | Unexpected constant condition |
| 12 | 256754 | error | no-constant-condition | Unexpected constant condition |
| 12 | 257534 | error | no-constant-condition | Unexpected constant condition |
| 12 | 260818 | error | no-constant-condition | Unexpected constant condition |
| 12 | 261118 | error | no-constant-condition | Unexpected constant condition |
| 12 | 261843 | error | no-constant-condition | Unexpected constant condition |
| 12 | 262087 | error | no-constant-condition | Unexpected constant condition |
| 12 | 267659 | error | no-constant-condition | Unexpected constant condition |
| 12 | 267972 | error | no-constant-condition | Unexpected constant condition |
| 12 | 268285 | error | no-constant-condition | Unexpected constant condition |
| 12 | 268599 | error | no-constant-condition | Unexpected constant condition |
| 12 | 268938 | error | no-constant-condition | Unexpected constant condition |
| 12 | 269286 | error | no-constant-condition | Unexpected constant condition |
| 12 | 269628 | error | no-constant-condition | Unexpected constant condition |
| 12 | 270021 | error | no-constant-condition | Unexpected constant condition |
| 12 | 270457 | error | no-constant-condition | Unexpected constant condition |
| 12 | 270763 | error | no-constant-condition | Unexpected constant condition |
| 12 | 271354 | error | no-constant-condition | Unexpected constant condition |
| 12 | 271645 | error | no-constant-condition | Unexpected constant condition |
| 12 | 272166 | error | no-constant-condition | Unexpected constant condition |
| 12 | 272671 | error | no-constant-condition | Unexpected constant condition |
| 12 | 272984 | error | no-constant-condition | Unexpected constant condition |
| 12 | 273297 | error | no-constant-condition | Unexpected constant condition |
| 12 | 273611 | error | no-constant-condition | Unexpected constant condition |
| 12 | 273925 | error | no-constant-condition | Unexpected constant condition |
| 12 | 274239 | error | no-constant-condition | Unexpected constant condition |
| 12 | 274578 | error | no-constant-condition | Unexpected constant condition |
| 12 | 274958 | error | no-constant-condition | Unexpected constant condition |
| 12 | 275399 | error | no-constant-condition | Unexpected constant condition |
| 12 | 275715 | error | no-constant-condition | Unexpected constant condition |
| 12 | 276321 | error | no-constant-condition | Unexpected constant condition |
| 12 | 276622 | error | no-constant-condition | Unexpected constant condition |
| 12 | 277158 | error | no-constant-condition | Unexpected constant condition |
| 12 | 277652 | error | no-constant-condition | Unexpected constant condition |
| 12 | 277994 | error | no-constant-condition | Unexpected constant condition |
| 12 | 278307 | error | no-constant-condition | Unexpected constant condition |
| 12 | 278646 | error | no-constant-condition | Unexpected constant condition |
| 12 | 278960 | error | no-constant-condition | Unexpected constant condition |
| 12 | 279302 | error | no-constant-condition | Unexpected constant condition |
| 12 | 279644 | error | no-constant-condition | Unexpected constant condition |
| 12 | 280003 | error | no-constant-condition | Unexpected constant condition |
| 12 | 280439 | error | no-constant-condition | Unexpected constant condition |
| 12 | 280728 | error | no-constant-condition | Unexpected constant condition |
| 12 | 281303 | error | no-constant-condition | Unexpected constant condition |
| 12 | 281574 | error | no-constant-condition | Unexpected constant condition |
| 12 | 282082 | error | no-constant-condition | Unexpected constant condition |
| 12 | 282587 | error | no-constant-condition | Unexpected constant condition |
| 12 | 282949 | error | no-constant-condition | Unexpected constant condition |
| 12 | 283303 | error | no-constant-condition | Unexpected constant condition |
| 12 | 283666 | error | no-constant-condition | Unexpected constant condition |
| 12 | 284021 | error | no-constant-condition | Unexpected constant condition |
| 12 | 284384 | error | no-constant-condition | Unexpected constant condition |
| 12 | 284739 | error | no-constant-condition | Unexpected constant condition |
| 12 | 285106 | error | no-constant-condition | Unexpected constant condition |
| 12 | 285572 | error | no-constant-condition | Unexpected constant condition |
| 12 | 286329 | error | no-constant-condition | Unexpected constant condition |
| 12 | 286988 | error | no-constant-condition | Unexpected constant condition |
| 12 | 287590 | error | no-constant-condition | Unexpected constant condition |
| 12 | 287614 | error | no-constant-condition | Unexpected constant condition |
| 12 | 287790 | error | no-constant-condition | Unexpected constant condition |
| 12 | 287997 | error | no-constant-condition | Unexpected constant condition |
| 12 | 288332 | error | no-constant-condition | Unexpected constant condition |
| 12 | 288356 | error | no-constant-condition | Unexpected constant condition |
| 12 | 288532 | error | no-constant-condition | Unexpected constant condition |
| 12 | 288739 | error | no-constant-condition | Unexpected constant condition |
| 12 | 289081 | error | no-constant-condition | Unexpected constant condition |
| 12 | 289105 | error | no-constant-condition | Unexpected constant condition |
| 12 | 289292 | error | no-constant-condition | Unexpected constant condition |
| 12 | 289505 | error | no-constant-condition | Unexpected constant condition |
| 12 | 289847 | error | no-constant-condition | Unexpected constant condition |
| 12 | 289871 | error | no-constant-condition | Unexpected constant condition |
| 12 | 290058 | error | no-constant-condition | Unexpected constant condition |
| 12 | 290271 | error | no-constant-condition | Unexpected constant condition |
| 12 | 290613 | error | no-constant-condition | Unexpected constant condition |
| 12 | 290637 | error | no-constant-condition | Unexpected constant condition |
| 12 | 290825 | error | no-constant-condition | Unexpected constant condition |
| 12 | 291038 | error | no-constant-condition | Unexpected constant condition |
| 12 | 291380 | error | no-constant-condition | Unexpected constant condition |
| 12 | 291404 | error | no-constant-condition | Unexpected constant condition |
| 12 | 291592 | error | no-constant-condition | Unexpected constant condition |
| 12 | 291805 | error | no-constant-condition | Unexpected constant condition |
| 12 | 292277 | error | no-constant-condition | Unexpected constant condition |
| 12 | 292590 | error | no-constant-condition | Unexpected constant condition |
| 12 | 292903 | error | no-constant-condition | Unexpected constant condition |
| 12 | 293217 | error | no-constant-condition | Unexpected constant condition |
| 12 | 293531 | error | no-constant-condition | Unexpected constant condition |
| 12 | 293845 | error | no-constant-condition | Unexpected constant condition |
| 12 | 294159 | error | no-constant-condition | Unexpected constant condition |
| 12 | 294499 | error | no-constant-condition | Unexpected constant condition |
| 12 | 294916 | error | no-constant-condition | Unexpected constant condition |
| 12 | 295210 | error | no-constant-condition | Unexpected constant condition |
| 12 | 295795 | error | no-constant-condition | Unexpected constant condition |
| 12 | 296071 | error | no-constant-condition | Unexpected constant condition |
| 12 | 296589 | error | no-constant-condition | Unexpected constant condition |
| 12 | 297237 | error | no-constant-condition | Unexpected constant condition |
| 12 | 298083 | error | no-constant-condition | Unexpected constant condition |
| 12 | 298322 | error | no-constant-condition | Unexpected constant condition |
| 12 | 298903 | error | no-constant-condition | Unexpected constant condition |
| 12 | 299344 | error | no-constant-condition | Unexpected constant condition |
| 12 | 300507 | error | no-constant-condition | Unexpected constant condition |
| 12 | 301248 | error | no-constant-condition | Unexpected constant condition |
| 12 | 305927 | error | no-constant-condition | Unexpected constant condition |
| 12 | 306412 | error | no-constant-condition | Unexpected constant condition |
| 12 | 306450 | error | no-constant-condition | Unexpected constant condition |
| 12 | 306482 | error | no-constant-condition | Unexpected constant condition |
| 12 | 311263 | error | no-constant-condition | Unexpected constant condition |
| 12 | 311866 | error | no-constant-condition | Unexpected constant condition |
| 12 | 312529 | error | no-constant-condition | Unexpected constant condition |
| 12 | 313973 | error | no-constant-condition | Unexpected constant condition |
| 12 | 314449 | error | no-constant-condition | Unexpected constant condition |
| 12 | 315378 | error | no-constant-condition | Unexpected constant condition |
| 12 | 315751 | error | no-constant-condition | Unexpected constant condition |
| 12 | 316124 | error | no-constant-condition | Unexpected constant condition |
| 12 | 316500 | error | no-constant-condition | Unexpected constant condition |
| 12 | 316876 | error | no-constant-condition | Unexpected constant condition |
| 12 | 317268 | error | no-constant-condition | Unexpected constant condition |
| 12 | 317661 | error | no-constant-condition | Unexpected constant condition |
| 12 | 318077 | error | no-constant-condition | Unexpected constant condition |
| 12 | 318481 | error | no-constant-condition | Unexpected constant condition |
| 12 | 318822 | error | no-constant-condition | Unexpected constant condition |
| 12 | 319151 | error | no-unused-vars | 'k' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 12 | 319189 | error | no-constant-condition | Unexpected constant condition |
| 12 | 319651 | error | no-constant-condition | Unexpected constant condition |
| 12 | 319952 | error | no-constant-condition | Unexpected constant condition |
| 12 | 320278 | error | no-constant-condition | Unexpected constant condition |
| 12 | 320618 | error | no-constant-condition | Unexpected constant condition |
| 12 | 320946 | error | no-constant-condition | Unexpected constant condition |
| 12 | 321278 | error | no-constant-condition | Unexpected constant condition |
| 12 | 321606 | error | no-constant-condition | Unexpected constant condition |
| 12 | 321981 | error | no-constant-condition | Unexpected constant condition |
| 12 | 322329 | error | no-constant-condition | Unexpected constant condition |
| 12 | 322899 | error | no-constant-condition | Unexpected constant condition |
| 12 | 323384 | error | no-constant-condition | Unexpected constant condition |
| 12 | 323850 | error | no-constant-condition | Unexpected constant condition |
| 12 | 324176 | error | no-constant-condition | Unexpected constant condition |
| 12 | 324477 | error | no-constant-condition | Unexpected constant condition |
| 12 | 324805 | error | no-constant-condition | Unexpected constant condition |
| 12 | 325133 | error | no-constant-condition | Unexpected constant condition |
| 12 | 325461 | error | no-constant-condition | Unexpected constant condition |
| 12 | 325789 | error | no-constant-condition | Unexpected constant condition |
| 12 | 326134 | error | no-constant-condition | Unexpected constant condition |
| 12 | 326482 | error | no-constant-condition | Unexpected constant condition |
| 12 | 327036 | error | no-constant-condition | Unexpected constant condition |
| 12 | 327510 | error | no-constant-condition | Unexpected constant condition |
| 12 | 328905 | error | no-constant-condition | Unexpected constant condition |
| 12 | 329343 | error | no-constant-condition | Unexpected constant condition |
| 12 | 330007 | error | no-constant-condition | Unexpected constant condition |
| 12 | 330763 | error | no-constant-condition | Unexpected constant condition |
| 12 | 331084 | error | no-constant-condition | Unexpected constant condition |
| 12 | 332112 | error | no-constant-condition | Unexpected constant condition |
| 12 | 332579 | error | no-constant-condition | Unexpected constant condition |
| 12 | 332724 | error | no-constant-condition | Unexpected constant condition |
| 12 | 333076 | error | no-constant-condition | Unexpected constant condition |
| 12 | 333250 | error | no-constant-condition | Unexpected constant condition |
| 12 | 333699 | error | no-constant-condition | Unexpected constant condition |
| 12 | 333873 | error | no-constant-condition | Unexpected constant condition |
| 12 | 335312 | error | no-constant-condition | Unexpected constant condition |
| 12 | 335465 | error | no-constant-condition | Unexpected constant condition |
| 12 | 335517 | error | no-constant-condition | Unexpected constant condition |
| 12 | 336936 | error | no-constant-condition | Unexpected constant condition |
| 12 | 337235 | error | no-constant-condition | Unexpected constant condition |
| 12 | 337774 | error | no-constant-condition | Unexpected constant condition |
| 12 | 337933 | error | no-constant-condition | Unexpected constant condition |
| 12 | 338031 | error | no-constant-condition | Unexpected constant condition |
| 12 | 339464 | error | no-constant-condition | Unexpected constant condition |
| 12 | 339502 | error | no-constant-condition | Unexpected constant condition |
| 12 | 344417 | error | no-constant-condition | Unexpected constant condition |
| 12 | 348179 | error | no-constant-condition | Unexpected constant condition |
| 12 | 348400 | error | no-constant-condition | Unexpected constant condition |
| 12 | 348754 | error | no-constant-condition | Unexpected constant condition |
| 12 | 348886 | error | no-constant-condition | Unexpected constant condition |
| 12 | 349292 | error | no-constant-condition | Unexpected constant condition |
| 12 | 349610 | error | no-constant-condition | Unexpected constant condition |
| 12 | 349845 | error | no-constant-condition | Unexpected constant condition |
| 12 | 350284 | error | no-constant-condition | Unexpected constant condition |
| 12 | 350514 | error | no-constant-condition | Unexpected constant condition |
| 12 | 350758 | error | no-constant-condition | Unexpected constant condition |
| 12 | 351035 | error | no-constant-condition | Unexpected constant condition |
| 12 | 351279 | error | no-constant-condition | Unexpected constant condition |
| 12 | 351972 | error | no-constant-condition | Unexpected constant condition |
| 12 | 352193 | error | no-constant-condition | Unexpected constant condition |
| 12 | 352547 | error | no-constant-condition | Unexpected constant condition |
| 12 | 352682 | error | no-constant-condition | Unexpected constant condition |
| 12 | 353112 | error | no-constant-condition | Unexpected constant condition |
| 12 | 353430 | error | no-constant-condition | Unexpected constant condition |
| 12 | 353665 | error | no-constant-condition | Unexpected constant condition |
| 12 | 354037 | error | no-constant-condition | Unexpected constant condition |
| 12 | 354267 | error | no-constant-condition | Unexpected constant condition |
| 12 | 354511 | error | no-constant-condition | Unexpected constant condition |
| 12 | 354788 | error | no-constant-condition | Unexpected constant condition |
| 12 | 355032 | error | no-constant-condition | Unexpected constant condition |
| 12 | 355849 | error | no-constant-condition | Unexpected constant condition |
| 12 | 355960 | error | no-constant-condition | Unexpected constant condition |
| 12 | 356820 | error | no-constant-condition | Unexpected constant condition |
| 12 | 356931 | error | no-constant-condition | Unexpected constant condition |
| 12 | 357742 | error | no-constant-condition | Unexpected constant condition |
| 12 | 357853 | error | no-constant-condition | Unexpected constant condition |
| 12 | 358647 | error | no-constant-condition | Unexpected constant condition |
| 12 | 359496 | error | no-constant-condition | Unexpected constant condition |
| 12 | 361725 | error | no-constant-condition | Unexpected constant condition |
| 12 | 361871 | error | no-constant-condition | Unexpected constant condition |
| 12 | 362059 | error | no-constant-condition | Unexpected constant condition |
| 12 | 362303 | error | no-constant-condition | Unexpected constant condition |
| 12 | 363073 | error | no-constant-condition | Unexpected constant condition |
| 12 | 365301 | error | no-constant-condition | Unexpected constant condition |
| 12 | 365447 | error | no-constant-condition | Unexpected constant condition |
| 12 | 365631 | error | no-constant-condition | Unexpected constant condition |
| 12 | 365875 | error | no-constant-condition | Unexpected constant condition |
| 12 | 366759 | error | no-constant-condition | Unexpected constant condition |
| 12 | 367265 | error | no-constant-condition | Unexpected constant condition |
| 12 | 368011 | error | no-constant-condition | Unexpected constant condition |
| 12 | 368188 | error | no-constant-condition | Unexpected constant condition |
| 12 | 373347 | error | no-constant-condition | Unexpected constant condition |
| 12 | 373434 | error | no-constant-condition | Unexpected constant condition |
| 12 | 373964 | error | no-constant-condition | Unexpected constant condition |
| 12 | 374038 | error | no-constant-condition | Unexpected constant condition |
| 12 | 374923 | error | no-constant-condition | Unexpected constant condition |
| 12 | 375010 | error | no-constant-condition | Unexpected constant condition |
| 12 | 375557 | error | no-constant-condition | Unexpected constant condition |
| 12 | 375657 | error | no-constant-condition | Unexpected constant condition |
| 12 | 376390 | error | no-constant-condition | Unexpected constant condition |
| 12 | 376505 | error | no-constant-condition | Unexpected constant condition |
| 12 | 376881 | error | no-constant-condition | Unexpected constant condition |
| 12 | 376989 | error | no-constant-condition | Unexpected constant condition |
| 12 | 377195 | error | no-constant-condition | Unexpected constant condition |
| 12 | 378889 | error | no-constant-condition | Unexpected constant condition |
| 12 | 379198 | error | no-constant-condition | Unexpected constant condition |
| 12 | 382769 | error | no-constant-condition | Unexpected constant condition |
| 12 | 383126 | error | no-constant-condition | Unexpected constant condition |
| 12 | 383551 | error | no-constant-condition | Unexpected constant condition |
| 12 | 384125 | error | no-constant-condition | Unexpected constant condition |
| 12 | 384483 | error | no-constant-condition | Unexpected constant condition |
| 12 | 384862 | error | no-constant-condition | Unexpected constant condition |
| 12 | 385309 | error | no-constant-condition | Unexpected constant condition |
| 12 | 389553 | error | no-constant-condition | Unexpected constant condition |
| 12 | 392230 | error | no-constant-condition | Unexpected constant condition |
| 12 | 392369 | error | no-constant-condition | Unexpected constant condition |
| 12 | 392553 | error | no-constant-condition | Unexpected constant condition |
| 12 | 392628 | error | no-constant-condition | Unexpected constant condition |
| 12 | 392805 | error | no-constant-condition | Unexpected constant condition |
| 12 | 393078 | error | no-constant-condition | Unexpected constant condition |
| 12 | 393346 | error | no-constant-condition | Unexpected constant condition |
| 12 | 393700 | error | no-constant-condition | Unexpected constant condition |
| 12 | 394054 | error | no-constant-condition | Unexpected constant condition |
| 12 | 394408 | error | no-constant-condition | Unexpected constant condition |
| 12 | 394759 | error | no-constant-condition | Unexpected constant condition |
| 12 | 395537 | error | no-constant-condition | Unexpected constant condition |
| 12 | 396644 | error | no-constant-condition | Unexpected constant condition |
| 12 | 397567 | error | no-constant-condition | Unexpected constant condition |
| 12 | 398234 | error | no-constant-condition | Unexpected constant condition |
| 12 | 398455 | error | no-constant-condition | Unexpected constant condition |
| 12 | 398762 | error | no-constant-condition | Unexpected constant condition |
| 12 | 399283 | error | no-constant-condition | Unexpected constant condition |
| 12 | 399607 | error | no-constant-condition | Unexpected constant condition |
| 12 | 399851 | error | no-constant-condition | Unexpected constant condition |
| 12 | 400137 | error | no-constant-condition | Unexpected constant condition |
| 12 | 400381 | error | no-constant-condition | Unexpected constant condition |
| 12 | 401351 | error | no-constant-condition | Unexpected constant condition |
| 12 | 401559 | error | no-constant-condition | Unexpected constant condition |
| 12 | 403118 | error | no-constant-condition | Unexpected constant condition |
| 12 | 403833 | error | no-constant-condition | Unexpected constant condition |
| 12 | 404054 | error | no-constant-condition | Unexpected constant condition |
| 12 | 404361 | error | no-constant-condition | Unexpected constant condition |
| 12 | 404843 | error | no-constant-condition | Unexpected constant condition |
| 12 | 405167 | error | no-constant-condition | Unexpected constant condition |
| 12 | 405411 | error | no-constant-condition | Unexpected constant condition |
| 12 | 405697 | error | no-constant-condition | Unexpected constant condition |
| 12 | 405941 | error | no-constant-condition | Unexpected constant condition |
| 12 | 406444 | error | no-constant-condition | Unexpected constant condition |
| 12 | 406673 | error | no-constant-condition | Unexpected constant condition |
| 12 | 407546 | error | no-constant-condition | Unexpected constant condition |
| 12 | 407708 | error | no-constant-condition | Unexpected constant condition |
| 12 | 407968 | error | no-constant-condition | Unexpected constant condition |
| 12 | 408353 | error | no-constant-condition | Unexpected constant condition |
| 12 | 411854 | error | no-constant-condition | Unexpected constant condition |
| 12 | 412247 | error | no-constant-condition | Unexpected constant condition |
| 12 | 412565 | error | no-constant-condition | Unexpected constant condition |
| 12 | 414024 | error | no-constant-condition | Unexpected constant condition |
| 12 | 414883 | error | no-constant-condition | Unexpected constant condition |
| 12 | 415302 | error | no-constant-condition | Unexpected constant condition |
| 12 | 415721 | error | no-constant-condition | Unexpected constant condition |
| 12 | 416140 | error | no-constant-condition | Unexpected constant condition |
| 12 | 417497 | error | no-constant-condition | Unexpected constant condition |
| 12 | 417907 | error | no-constant-condition | Unexpected constant condition |
| 12 | 418317 | error | no-constant-condition | Unexpected constant condition |
| 12 | 418727 | error | no-constant-condition | Unexpected constant condition |
| 12 | 420317 | error | no-constant-condition | Unexpected constant condition |
| 12 | 420464 | error | no-constant-condition | Unexpected constant condition |
| 12 | 421804 | error | no-constant-condition | Unexpected constant condition |
| 12 | 422371 | error | no-constant-condition | Unexpected constant condition |
| 12 | 423731 | error | no-constant-condition | Unexpected constant condition |
| 12 | 423981 | error | no-constant-condition | Unexpected constant condition |
| 12 | 424525 | error | no-constant-condition | Unexpected constant condition |
| 12 | 425885 | error | no-constant-condition | Unexpected constant condition |
| 12 | 426135 | error | no-constant-condition | Unexpected constant condition |
| 12 | 427087 | error | no-constant-condition | Unexpected constant condition |
| 12 | 429880 | error | no-constant-condition | Unexpected constant condition |
| 12 | 430275 | error | no-constant-condition | Unexpected constant condition |
| 12 | 432138 | error | no-constant-condition | Unexpected constant condition |
| 12 | 433559 | error | no-constant-condition | Unexpected constant condition |
| 12 | 433852 | error | no-constant-condition | Unexpected constant condition |
| 12 | 434382 | error | no-constant-condition | Unexpected constant condition |
| 12 | 434538 | error | no-constant-condition | Unexpected constant condition |
| 12 | 434636 | error | no-constant-condition | Unexpected constant condition |
| 12 | 435270 | error | no-constant-condition | Unexpected constant condition |
| 12 | 437182 | error | no-constant-condition | Unexpected constant condition |
| 12 | 439094 | error | no-constant-condition | Unexpected constant condition |
| 12 | 441002 | error | no-constant-condition | Unexpected constant condition |
| 12 | 445534 | error | no-constant-condition | Unexpected constant condition |
| 12 | 445634 | error | no-constant-condition | Unexpected constant condition |
| 12 | 448336 | error | no-constant-condition | Unexpected constant condition |
| 12 | 448511 | error | no-constant-condition | Unexpected constant condition |
| 12 | 448731 | error | no-constant-condition | Unexpected constant condition |
| 12 | 449554 | error | no-constant-condition | Unexpected constant condition |
| 12 | 449704 | error | no-constant-condition | Unexpected constant condition |
| 12 | 450304 | error | no-constant-condition | Unexpected constant condition |
| 12 | 450538 | error | no-constant-condition | Unexpected constant condition |
| 12 | 450713 | error | no-constant-condition | Unexpected constant condition |
| 12 | 450760 | error | no-constant-condition | Unexpected constant condition |
| 12 | 451239 | error | no-constant-condition | Unexpected constant condition |
| 12 | 451391 | error | no-constant-condition | Unexpected constant condition |
| 12 | 451961 | error | no-constant-condition | Unexpected constant condition |
| 12 | 452792 | error | no-constant-condition | Unexpected constant condition |
| 12 | 452915 | error | no-constant-condition | Unexpected constant condition |
| 12 | 453507 | error | no-constant-condition | Unexpected constant condition |
| 12 | 454871 | error | no-constant-condition | Unexpected constant condition |
| 12 | 455042 | error | no-constant-condition | Unexpected constant condition |
| 12 | 455137 | error | no-constant-condition | Unexpected constant condition |
| 12 | 455335 | error | no-constant-condition | Unexpected constant condition |
| 12 | 456360 | error | no-constant-condition | Unexpected constant condition |
| 12 | 456531 | error | no-constant-condition | Unexpected constant condition |
| 12 | 456626 | error | no-constant-condition | Unexpected constant condition |
| 12 | 456824 | error | no-constant-condition | Unexpected constant condition |
| 12 | 459150 | error | no-constant-condition | Unexpected constant condition |
| 12 | 460574 | error | no-constant-condition | Unexpected constant condition |
| 12 | 461720 | error | no-constant-condition | Unexpected constant condition |
| 12 | 461941 | error | no-constant-condition | Unexpected constant condition |
| 12 | 462196 | error | no-constant-condition | Unexpected constant condition |
| 12 | 462266 | error | no-constant-condition | Unexpected constant condition |
| 12 | 462495 | error | no-constant-condition | Unexpected constant condition |
| 12 | 464305 | error | no-constant-condition | Unexpected constant condition |
| 12 | 464426 | error | no-constant-condition | Unexpected constant condition |
| 12 | 464805 | error | no-constant-condition | Unexpected constant condition |
| 12 | 464976 | error | no-constant-condition | Unexpected constant condition |
| 12 | 465081 | error | no-constant-condition | Unexpected constant condition |
| 12 | 465265 | error | no-constant-condition | Unexpected constant condition |
| 12 | 465610 | error | no-constant-condition | Unexpected constant condition |
| 12 | 467241 | error | no-constant-condition | Unexpected constant condition |
| 12 | 468636 | error | no-constant-condition | Unexpected constant condition |
| 12 | 468803 | error | no-constant-condition | Unexpected constant condition |
| 12 | 468908 | error | no-constant-condition | Unexpected constant condition |
| 12 | 469092 | error | no-constant-condition | Unexpected constant condition |
| 12 | 469889 | error | no-constant-condition | Unexpected constant condition |
| 12 | 470056 | error | no-constant-condition | Unexpected constant condition |
| 12 | 470161 | error | no-constant-condition | Unexpected constant condition |
| 12 | 470345 | error | no-constant-condition | Unexpected constant condition |
| 12 | 471142 | error | no-constant-condition | Unexpected constant condition |
| 12 | 471309 | error | no-constant-condition | Unexpected constant condition |
| 12 | 471414 | error | no-constant-condition | Unexpected constant condition |
| 12 | 471596 | error | no-constant-condition | Unexpected constant condition |
| 12 | 472393 | error | no-constant-condition | Unexpected constant condition |
| 12 | 472560 | error | no-constant-condition | Unexpected constant condition |
| 12 | 472665 | error | no-constant-condition | Unexpected constant condition |
| 12 | 472847 | error | no-constant-condition | Unexpected constant condition |
| 12 | 474598 | error | no-constant-condition | Unexpected constant condition |
| 12 | 474882 | error | no-constant-condition | Unexpected constant condition |
| 12 | 475188 | error | no-constant-condition | Unexpected constant condition |
| 12 | 475769 | error | no-constant-condition | Unexpected constant condition |
| 12 | 475909 | error | no-constant-condition | Unexpected constant condition |
| 12 | 476043 | error | no-constant-condition | Unexpected constant condition |
| 12 | 476197 | error | no-constant-condition | Unexpected constant condition |
| 12 | 476277 | error | no-constant-condition | Unexpected constant condition |
| 12 | 478105 | error | no-constant-condition | Unexpected constant condition |
| 12 | 478221 | error | no-constant-condition | Unexpected constant condition |
| 12 | 478597 | error | no-constant-condition | Unexpected constant condition |
| 12 | 478706 | error | no-constant-condition | Unexpected constant condition |
| 12 | 479140 | error | no-constant-condition | Unexpected constant condition |
| 12 | 479262 | error | no-constant-condition | Unexpected constant condition |
| 12 | 479671 | error | no-constant-condition | Unexpected constant condition |
| 12 | 479786 | error | no-constant-condition | Unexpected constant condition |
| 12 | 480001 | error | no-constant-condition | Unexpected constant condition |
| 12 | 480329 | error | no-constant-condition | Unexpected constant condition |
| 12 | 480431 | error | no-constant-condition | Unexpected constant condition |
| 12 | 480657 | error | no-constant-condition | Unexpected constant condition |
| 12 | 481014 | error | no-constant-condition | Unexpected constant condition |
| 12 | 481123 | error | no-constant-condition | Unexpected constant condition |
| 12 | 482865 | error | no-constant-condition | Unexpected constant condition |
| 12 | 483328 | error | no-constant-condition | Unexpected constant condition |
| 12 | 483761 | error | no-constant-condition | Unexpected constant condition |
| 12 | 484169 | error | no-constant-condition | Unexpected constant condition |
| 12 | 484374 | error | no-constant-condition | Unexpected constant condition |
| 12 | 484473 | error | no-constant-condition | Unexpected constant condition |
| 12 | 484821 | error | no-constant-condition | Unexpected constant condition |
| 12 | 484976 | error | no-constant-condition | Unexpected constant condition |
| 12 | 485407 | error | no-constant-condition | Unexpected constant condition |
| 12 | 485551 | error | no-constant-condition | Unexpected constant condition |
| 12 | 485693 | error | no-constant-condition | Unexpected constant condition |
| 12 | 487018 | error | no-constant-condition | Unexpected constant condition |
| 12 | 487251 | error | no-constant-condition | Unexpected constant condition |
| 12 | 487500 | error | no-constant-condition | Unexpected constant condition |
| 12 | 488065 | error | no-constant-condition | Unexpected constant condition |
| 12 | 488187 | error | no-constant-condition | Unexpected constant condition |
| 12 | 488602 | error | no-constant-condition | Unexpected constant condition |
| 12 | 488717 | error | no-constant-condition | Unexpected constant condition |
| 12 | 489829 | error | no-constant-condition | Unexpected constant condition |
| 12 | 490594 | error | no-constant-condition | Unexpected constant condition |
| 12 | 490906 | error | no-constant-condition | Unexpected constant condition |
| 12 | 492202 | error | no-constant-condition | Unexpected constant condition |
| 12 | 493942 | error | no-constant-condition | Unexpected constant condition |
| 12 | 495438 | error | no-constant-condition | Unexpected constant condition |
| 12 | 495836 | error | no-constant-condition | Unexpected constant condition |
| 12 | 496048 | error | no-constant-condition | Unexpected constant condition |
| 12 | 496575 | error | no-constant-condition | Unexpected constant condition |
| 12 | 496925 | error | no-constant-condition | Unexpected constant condition |
| 12 | 498566 | error | no-constant-condition | Unexpected constant condition |
| 12 | 499429 | error | no-constant-condition | Unexpected constant condition |
| 12 | 499779 | error | no-constant-condition | Unexpected constant condition |
| 12 | 500454 | error | no-constant-condition | Unexpected constant condition |
| 12 | 500506 | error | no-constant-condition | Unexpected constant condition |
| 12 | 500849 | error | no-constant-condition | Unexpected constant condition |
| 12 | 501457 | error | no-constant-condition | Unexpected constant condition |
| 12 | 502425 | error | no-constant-condition | Unexpected constant condition |
| 12 | 505309 | error | no-constant-condition | Unexpected constant condition |
| 12 | 505420 | error | no-constant-condition | Unexpected constant condition |
| 12 | 506956 | error | no-constant-condition | Unexpected constant condition |
| 12 | 507097 | error | no-constant-condition | Unexpected constant condition |
| 12 | 510536 | error | no-constant-condition | Unexpected constant condition |
| 12 | 511273 | error | no-constant-condition | Unexpected constant condition |
| 12 | 511514 | error | no-constant-condition | Unexpected constant condition |
| 12 | 512110 | error | no-constant-condition | Unexpected constant condition |
| 12 | 512359 | error | no-constant-condition | Unexpected constant condition |
| 12 | 513724 | error | no-constant-condition | Unexpected constant condition |
| 12 | 513973 | error | no-constant-condition | Unexpected constant condition |
| 12 | 514783 | error | no-constant-condition | Unexpected constant condition |
| 12 | 517065 | error | no-constant-condition | Unexpected constant condition |
| 12 | 517814 | error | no-constant-condition | Unexpected constant condition |
| 12 | 518017 | error | no-constant-condition | Unexpected constant condition |
| 12 | 518237 | error | no-constant-condition | Unexpected constant condition |
| 12 | 518587 | error | no-constant-condition | Unexpected constant condition |
| 12 | 518790 | error | no-constant-condition | Unexpected constant condition |
| 12 | 519001 | error | no-constant-condition | Unexpected constant condition |
| 13 | 194 | error | no-constant-condition | Unexpected constant condition |
| 13 | 312 | error | no-constant-condition | Unexpected constant condition |
| 13 | 413 | error | no-constant-condition | Unexpected constant condition |
| 13 | 493 | error | no-constant-condition | Unexpected constant condition |
| 13 | 578 | error | no-constant-condition | Unexpected constant condition |
| 13 | 670 | error | no-constant-condition | Unexpected constant condition |
| 13 | 1878 | error | no-constant-condition | Unexpected constant condition |
| 13 | 2046 | error | no-constant-condition | Unexpected constant condition |
| 13 | 2639 | error | no-fallthrough | Expected a 'break' statement before 'default' |
| 13 | 5581 | error | no-constant-condition | Unexpected constant condition |
| 13 | 6336 | error | no-constant-condition | Unexpected constant condition |
| 13 | 7314 | error | no-constant-condition | Unexpected constant condition |
| 13 | 7526 | error | no-constant-condition | Unexpected constant condition |
| 13 | 8025 | error | no-constant-condition | Unexpected constant condition |
| 13 | 8292 | error | no-constant-condition | Unexpected constant condition |
| 13 | 8771 | error | no-constant-condition | Unexpected constant condition |
| 13 | 8878 | error | no-constant-condition | Unexpected constant condition |
| 13 | 11104 | error | no-constant-condition | Unexpected constant condition |
| 13 | 12297 | error | no-constant-condition | Unexpected constant condition |
| 13 | 12860 | error | no-constant-condition | Unexpected constant condition |
| 13 | 13484 | error | no-constant-condition | Unexpected constant condition |
| 13 | 14315 | error | no-constant-condition | Unexpected constant condition |
| 13 | 14876 | error | no-constant-condition | Unexpected constant condition |
| 13 | 15487 | error | no-constant-condition | Unexpected constant condition |
| 13 | 16011 | error | no-constant-condition | Unexpected constant condition |
| 13 | 17666 | error | no-constant-condition | Unexpected constant condition |
| 13 | 18467 | error | no-constant-condition | Unexpected constant condition |
| 13 | 18546 | error | no-constant-condition | Unexpected constant condition |
| 13 | 19615 | error | no-constant-condition | Unexpected constant condition |
| 13 | 20056 | error | no-constant-condition | Unexpected constant condition |
| 13 | 20290 | error | no-constant-condition | Unexpected constant condition |
| 13 | 20378 | error | no-constant-condition | Unexpected constant condition |
| 13 | 21840 | error | no-constant-condition | Unexpected constant condition |
| 13 | 22904 | error | no-constant-condition | Unexpected constant condition |
| 13 | 24760 | error | no-constant-condition | Unexpected constant condition |
| 13 | 25709 | error | no-constant-condition | Unexpected constant condition |
| 13 | 26137 | error | no-constant-condition | Unexpected constant condition |
| 13 | 26311 | error | no-constant-condition | Unexpected constant condition |
| 13 | 26657 | error | no-constant-condition | Unexpected constant condition |
| 13 | 26834 | error | no-constant-condition | Unexpected constant condition |
| 13 | 27184 | error | no-constant-condition | Unexpected constant condition |
| 13 | 27388 | error | no-constant-condition | Unexpected constant condition |
| 13 | 27950 | error | no-constant-condition | Unexpected constant condition |
| 13 | 28492 | error | no-constant-condition | Unexpected constant condition |
| 13 | 30217 | error | no-constant-condition | Unexpected constant condition |
| 13 | 30391 | error | no-constant-condition | Unexpected constant condition |
| 13 | 30726 | error | no-constant-condition | Unexpected constant condition |
| 13 | 30903 | error | no-constant-condition | Unexpected constant condition |
| 13 | 31732 | error | no-constant-condition | Unexpected constant condition |
| 13 | 31909 | error | no-constant-condition | Unexpected constant condition |
| 13 | 32977 | error | no-constant-condition | Unexpected constant condition |
| 13 | 34401 | error | no-constant-condition | Unexpected constant condition |
| 13 | 34839 | error | no-constant-condition | Unexpected constant condition |
| 13 | 35999 | error | no-constant-condition | Unexpected constant condition |
| 13 | 36181 | error | no-constant-condition | Unexpected constant condition |
| 13 | 37389 | error | no-constant-condition | Unexpected constant condition |
| 13 | 37813 | error | no-constant-condition | Unexpected constant condition |
| 13 | 38744 | error | no-constant-condition | Unexpected constant condition |
| 13 | 41461 | error | no-constant-condition | Unexpected constant condition |
| 13 | 44049 | error | no-constant-condition | Unexpected constant condition |
| 13 | 45094 | error | no-constant-condition | Unexpected constant condition |
| 13 | 46370 | error | no-constant-condition | Unexpected constant condition |
| 13 | 47078 | error | no-constant-condition | Unexpected constant condition |
| 13 | 47400 | error | no-constant-condition | Unexpected constant condition |
| 14 | 2254 | error | no-constant-condition | Unexpected constant condition |
| 14 | 2360 | error | no-constant-condition | Unexpected constant condition |
| 14 | 2563 | error | no-constant-condition | Unexpected constant condition |
| 14 | 2960 | error | no-constant-condition | Unexpected constant condition |
| 14 | 3444 | error | no-constant-condition | Unexpected constant condition |
| 14 | 4065 | error | no-constant-condition | Unexpected constant condition |
| 14 | 4626 | error | no-constant-condition | Unexpected constant condition |
| 14 | 4922 | error | no-constant-condition | Unexpected constant condition |
| 14 | 5445 | error | no-constant-condition | Unexpected constant condition |
| 14 | 5924 | error | no-constant-condition | Unexpected constant condition |
| 14 | 6725 | error | no-constant-condition | Unexpected constant condition |
| 14 | 7469 | error | no-constant-condition | Unexpected constant condition |
| 14 | 7530 | error | no-constant-condition | Unexpected constant condition |
| 14 | 7613 | error | no-constant-condition | Unexpected constant condition |
| 14 | 8534 | error | no-constant-condition | Unexpected constant condition |
| 14 | 9178 | error | no-constant-condition | Unexpected constant condition |
| 14 | 12061 | error | no-constant-condition | Unexpected constant condition |
| 14 | 12435 | error | no-constant-condition | Unexpected constant condition |
| 14 | 12650 | error | no-constant-condition | Unexpected constant condition |
| 14 | 19164 | error | no-unused-vars | 'c' is assigned a value but never used |
| 14 | 21698 | error | no-constant-condition | Unexpected constant condition |
| 15 | 440 | error | no-constant-condition | Unexpected constant condition |
| 16 | 719 | error | no-unused-vars | 'b' is assigned a value but never used |
| 16 | 784 | error | no-unused-vars | 'b' is assigned a value but never used |
| 16 | 1608 | error | no-unused-vars | 'd' is assigned a value but never used |
| 16 | 2602 | error | no-unused-vars | 'c' is assigned a value but never used |
| 16 | 3641 | error | no-unused-vars | 'b' is assigned a value but never used |
| 16 | 3755 | error | no-unused-vars | 'b' is assigned a value but never used |
| 16 | 3831 | error | no-unused-vars | 'b' is assigned a value but never used |
| 16 | 3869 | error | no-unused-vars | 'b' is assigned a value but never used |
| 16 | 3907 | error | no-unused-vars | 'b' is assigned a value but never used |
| 16 | 4180 | error | no-unused-vars | 'a' is assigned a value but never used |
| 16 | 4213 | error | no-unused-vars | 'a' is assigned a value but never used |
| 16 | 4246 | error | no-unused-vars | 'a' is assigned a value but never used |
| 16 | 4466 | error | no-unused-vars | 'a' is assigned a value but never used |
| 16 | 4496 | error | no-unused-vars | 'a' is assigned a value but never used |
| 16 | 4526 | error | no-unused-vars | 'a' is assigned a value but never used |
| 16 | 4556 | error | no-unused-vars | 'a' is assigned a value but never used |
| 16 | 4586 | error | no-unused-vars | 'a' is assigned a value but never used |
| 16 | 4616 | error | no-unused-vars | 'a' is assigned a value but never used |
| 16 | 4646 | error | no-unused-vars | 'a' is assigned a value but never used |
| 16 | 4784 | error | no-unused-vars | 'a' is assigned a value but never used |
| 16 | 5248 | error | no-unused-vars | 'a' is assigned a value but never used |
| 22 | 3080 | error | no-unused-vars | 'wasmTable' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 22 | 4011 | error | no-unused-vars | 'id' is defined but never used |
| 22 | 4150 | error | no-unused-vars | 'id' is defined but never used |
| 22 | 6034 | error | no-unused-vars | 'module' is defined but never used |
| 22 | 9279 | error | no-unused-vars | 'exceptionLast' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 22 | 9299 | error | no-unused-vars | 'uncaughtExceptionCount' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 22 | 9779 | error | no-unused-vars | 'e' is defined but never used |
| 22 | 9781 | error | no-empty | Empty block statement |
| 22 | 10557 | error | no-unused-vars | 'fd' is defined but never used |
| 22 | 10589 | error | no-unused-vars | 'fd' is defined but never used |
| 22 | 10592 | error | no-unused-vars | 'offset_low' is defined but never used |
| 22 | 10603 | error | no-unused-vars | 'offset_high' is defined but never used |
| 22 | 10615 | error | no-unused-vars | 'whence' is defined but never used |
| 22 | 10622 | error | no-unused-vars | 'newOffset' is defined but never used |
| 22 | 11586 | error | no-useless-escape | Unnecessary escape character: \+ |
| 22 | 11588 | error | no-useless-escape | Unnecessary escape character: \/ |
| 22 | 11590 | error | no-useless-escape | Unnecessary escape character: \= |
| 22 | 12116 | error | no-undef | 'Buffer' is not defined |
| 22 | 12370 | error | no-unused-vars | '_' is defined but never used |
| 22 | 12729 | error | no-unused-vars | 'asm' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 30 | 3 | error | no-undef | 'module' is not defined |
| 31 | 42 | error | no-undef | 'define' is not defined |
| 32 | 3 | error | no-undef | 'define' is not defined |
| 34 | 3 | error | no-undef | 'exports' is not defined |

### C:\Users\Windows\Desktop\ASE\SIIS\public\draco\draco_wasm_wrapper.js

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 2 | 286 | error | no-undef | 'global' is not defined |
| 4 | 5 | error | no-unused-vars | '$jscomp$lookupPolyfilledValue' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 8 | 125 | error | no-unused-vars | 'v' is defined but never used |
| 16 | 373 | error | no-unused-vars | 'n' is defined but never used |
| 22 | 168 | error | no-undef | '__filename' is not defined |
| 33 | 130 | error | no-undef | 'process' is not defined |
| 33 | 165 | error | no-undef | 'process' is not defined |
| 33 | 206 | error | no-undef | 'require' is not defined |
| 33 | 223 | error | no-undef | 'require' is not defined |
| 33 | 262 | error | no-undef | '__dirname' is not defined |
| 34 | 80 | error | no-undef | 'process' is not defined |
| 34 | 101 | error | no-undef | 'process' is not defined |
| 34 | 136 | error | no-undef | 'process' is not defined |
| 36 | 297 | error | no-unused-vars | 'vd' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 37 | 215 | error | no-unused-vars | 'X' is defined but never used |
| 37 | 217 | error | no-empty | Empty block statement |
| 37 | 263 | error | no-unused-vars | 'e' is defined but never used |
| 37 | 288 | error | no-unused-vars | 'e' is defined but never used |
| 37 | 290 | error | no-unused-vars | 'b' is defined but never used |
| 37 | 292 | error | no-unused-vars | 'c' is defined but never used |
| 37 | 294 | error | no-unused-vars | 'd' is defined but never used |
| 37 | 296 | error | no-unused-vars | 'g' is defined but never used |
| 38 | 50 | error | no-unused-vars | 'u' is defined but never used |
| 117 | 53 | error | no-undef | 'module' is not defined |
| 117 | 115 | error | no-undef | 'define' is not defined |
| 117 | 126 | error | no-undef | 'define' is not defined |
| 117 | 203 | error | no-undef | 'exports' is not defined |

### C:\Users\Windows\Desktop\ASE\SIIS\src\components\layout\MainLayout.jsx

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 11 | 14 | error | react-refresh/only-export-components | Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components |

### C:\Users\Windows\Desktop\ASE\SIIS\src\components\layout\Navbar.jsx

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 185 | 35 | error | no-unused-vars | 'Icon' is defined but never used |

### C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\navPathfinding.js

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 444 | 49 | error | no-unused-vars | 'grid' is defined but never used |
| 741 | 67 | error | no-unused-vars | '_options' is assigned a value but never used |

### C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 387 | 10 | error | no-unused-vars | 'easeInOutCubic' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| 714 | 10 | error | no-unused-vars | 'fitCameraTopDown' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| 848 | 10 | error | no-unused-vars | 'fitEntryCameraTopDown' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| 1765 | 12 | error | no-unused-vars | 'simplifyRouteGuidePoints' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| 1855 | 12 | error | no-unused-vars | 'nearestReachableNavPoint' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| 1893 | 12 | error | no-unused-vars | 'trianglesConnected' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| 1987 | 12 | error | no-unused-vars | 'orthogonalizePolyline' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| 2185 | 12 | error | no-unused-vars | 'buildRelativeCue' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| 4103 | 6 | warning | react-hooks/exhaustive-deps | React Hook useEffect has missing dependencies: 'setLabelsVisible' and 'showLabelsForSelection'. Either include them or remove the dependency array |

### C:\Users\Windows\Desktop\ASE\SIIS\src\context\AuthContext.jsx

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 40 | 17 | error | react-refresh/only-export-components | Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components |

### C:\Users\Windows\Desktop\ASE\SIIS\src\hooks\useChat.js

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 1 | 33 | error | no-unused-vars | 'useRef' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |

### C:\Users\Windows\Desktop\ASE\SIIS\src\hooks\useLocalStorage.js

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 21 | 13 | error | no-empty | Empty block statement |

### C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 176 | 14 | error | no-unused-vars | 'err' is defined but never used |
| 200 | 14 | error | no-unused-vars | 'err' is defined but never used |
| 302 | 9 | error | no-unused-vars | 'formatDateTime' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| 686 | 16 | error | no-unused-vars | 'err' is defined but never used |
| 694 | 6 | warning | react-hooks/exhaustive-deps | React Hook useEffect has missing dependencies: 'refreshPendingCitas' and 'refreshWeekData'. Either include them or remove the dependency array |
| 881 | 14 | error | no-unused-vars | 'err' is defined but never used |
| 896 | 14 | error | no-unused-vars | 'err' is defined but never used |
| 909 | 14 | error | no-unused-vars | 'err' is defined but never used |
| 922 | 14 | error | no-unused-vars | 'err' is defined but never used |

### C:\Users\Windows\Desktop\ASE\SIIS\src\services\chatService.test.js

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 10 | 5 | error | no-undef | 'global' is not defined |
| 17 | 12 | error | no-undef | 'global' is not defined |
| 24 | 5 | error | no-undef | 'global' is not defined |
| 34 | 5 | error | no-undef | 'global' is not defined |
| 41 | 12 | error | no-undef | 'global' is not defined |

### C:\Users\Windows\Desktop\ASE\SIIS\src\services\http.test.js

| Linea | Columna | Severidad | Regla | Motivo |
|---:|---:|---|---|---|
| 13 | 5 | error | no-undef | 'global' is not defined |
| 17 | 12 | error | no-undef | 'global' is not defined |
| 26 | 5 | error | no-undef | 'global' is not defined |
| 36 | 5 | error | no-undef | 'global' is not defined |


