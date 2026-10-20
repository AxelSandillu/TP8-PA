# Informe · Laboratorio 01

## 1. Qué ve una persona asignada a B

Una persona asignada a la variante B ve el titular **“El curso empieza el 14 de abril. El cupo, no.”**, con el llamado a la acción **“Reservar mi lugar”**. En el HTML del primer response recibe el title **“Abril abre cupos: cursos de oficio en grupos de 12”** y la description **“El 14 de abril empiezan grupos de doce. En la cohorte anterior, ocho de cada diez consiguieron trabajo en el rubro antes de los noventa días.”** Ambos metadatos están dentro de los rangos pedidos (50 caracteres de title y 141 de description).

Lo que no cambia es la oferta: el inicio sigue siendo el 14 de abril, la duración es de 8 semanas, el cupo es de 12 personas y los oficios son carpintería, electricidad y cocina. Tampoco cambia el canonical ni el producto. B solo cambia el mensaje: en lugar de hablar del método, apura la decisión con la fecha y el cupo.

## 2. Qué debería ver un crawler

Un crawler debería ver siempre la variante de control A, en la misma URL y con el mismo canonical. Los rastreadores suelen no conservar cookies entre visitas; si cada request sin cookie sorteara una variante distinta, el buscador podría indexar un title y una description inestables, y hasta alternar entre dos textos sin saber cuál corresponde a la página.

Por eso los user agents de buscadores reciben el control como default estable, sin cookie de asignación y sin que se les cuente una impresión. Esto no es cloaking: no se le muestra al buscador un contenido distinto para manipular el ranking. Se le sirve la misma página, en la misma URL, con el mismo canonical, y la variante de control funciona como versión canónica del mensaje. La persona sí puede ver A o B según su asignación estable, pero ambas variantes son la misma oferta y la misma página indexable.

## 3. Por qué el canonical no cambia

El canonical es siempre `/practica`, sin query, porque A y B no son dos páginas: son dos mensajes de la misma página. La variante vive en una cookie httpOnly, no en la dirección. Si se canonizara `?variant=b`, o si se publicaran `/variante-a` y `/variante-b`, el buscador vería dos o tres URLs con contenido casi idéntico y la indexación se repartiría entre duplicados.

El preview es la excepción controlada: `?preview=a` y `?preview=b` existen para inspeccionar las piezas, no para indexarlas. No escriben cookies, no cuentan como visita y llevan `noindex, nofollow`. El canonical sigue apuntando a `/practica` limpio. Así hay una sola URL indexable y el experimento no se parte.

## Función de hash y prueba

La asignación usa **FNV-1a de 32 bits sobre los bytes UTF-8** del identificador del visitante. La paridad del hash decide la variante: si el resultado es par, A; si es impar, B. Es una función determinística, no un sorteo en cada render.

Prueba pedida:

```text
assignVariant('lab-visitor-demo-01') = B
```

Repetir el mismo identificador devuelve siempre B. El visitante se genera una vez y se guarda en una cookie de 30 días; recargar no cambia la variante.

El caso de prueba da 7,50% para A, 13,14% para B y una diferencia de 5,64 puntos porcentuales. Esa diferencia es un dato descriptivo: no alcanza para declarar que B ganó.
