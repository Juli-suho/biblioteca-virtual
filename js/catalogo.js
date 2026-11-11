let libros = [];
let categoriaSeleccionada = "Todos";
const contenedor = document.getElementById("contenedor-libros");
const buscador = document.getElementById("buscador");
const mensajeResultados = document.getElementById("mensaje-resultados");
const menuCategorias = document.getElementById("menu-categorias");
const lectorLibro = document.getElementById("lector-libro");
const tituloLector = document.getElementById("titulo-lector");
const visorPdf = document.getElementById("visor-pdf");
const avisoLector = document.getElementById("aviso-lector");

async function cargarLibros() {
  try {
    const respuesta = await fetch("datos/libros.json");
    if (!respuesta.ok) throw new Error("No se pudo cargar datos/libros.json");
    libros = await respuesta.json();
    if (!Array.isArray(libros)) throw new Error("El catálogo debe ser una lista JSON.");
    generarCategorias();
    aplicarFiltros();
  } catch (error) {
    console.error("Error al cargar los libros:", error);
    mensajeResultados.textContent = "No se pudo cargar el catálogo. Abre la biblioteca mediante Live Server o un servidor web local.";
    contenedor.innerHTML = '<p class="sin-resultados">Comprueba que el servidor esté activo y que exista el archivo datos/libros.json.</p>';
  }
}

function generarCategorias() {
  const categorias = [...new Set(libros.map(libro => libro.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  menuCategorias.replaceChildren();
  ["Todos", ...categorias].forEach(categoria => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = categoria;
    boton.className = "boton-categoria" + (categoriaSeleccionada === categoria ? " activa" : "");
    boton.setAttribute("aria-pressed", String(categoriaSeleccionada === categoria));
    boton.addEventListener("click", () => {
      categoriaSeleccionada = categoria;
      aplicarFiltros();
    });
    menuCategorias.append(boton);
  });
}

function aplicarFiltros() {
  const texto = normalizar(buscador.value);
  const resultados = libros.filter(libro => {
    const coincideTexto = [libro.titulo, libro.autor, libro.categoria, libro.descripcion]
      .some(valor => normalizar(valor || "").includes(texto));
    const coincideCategoria = categoriaSeleccionada === "Todos" || libro.categoria === categoriaSeleccionada;
    return coincideTexto && coincideCategoria;
  });
  mostrarLibros(resultados);
  generarCategorias();
}

function normalizar(texto) {
  return String(texto).toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function mostrarLibros(listaLibros) {
  contenedor.replaceChildren();
  if (listaLibros.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "sin-resultados";
    vacio.textContent = "No se encontraron libros. Prueba con otra búsqueda o categoría.";
    contenedor.append(vacio);
  }

  listaLibros.forEach(libro => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-libro";
    const imagen = document.createElement("img");
    imagen.className = "imagen-portada";
    imagen.src = libro.portada;
    imagen.alt = "Portada de " + libro.titulo;
    imagen.loading = "lazy";
    imagen.onerror = () => { imagen.src = crearPortadaAlternativa(libro.titulo); };

    const informacion = document.createElement("div");
    informacion.className = "informacion-libro";
    const titulo = document.createElement("h3"); titulo.textContent = libro.titulo;
    const autor = document.createElement("p"); autor.textContent = "Autor: " + (libro.autor || "No especificado");
    const categoria = document.createElement("p"); categoria.textContent = "Categoría: " + (libro.categoria || "General");
    const descripcion = document.createElement("p"); descripcion.className = "descripcion-libro";
    descripcion.textContent = libro.descripcion || "Sin descripción disponible.";
    informacion.append(titulo, autor, categoria, descripcion);
    tarjeta.append(imagen, informacion);

    (Array.isArray(libro.archivos) ? libro.archivos : []).forEach(archivo => {
      if (!archivo.ruta || !archivo.tipo) return;
      const grupo = document.createElement("div"); grupo.className = "grupo-archivo";
      const botonLeer = document.createElement("button");
      botonLeer.type = "button"; botonLeer.className = "boton-libro";
      botonLeer.textContent = "Leer " + archivo.tipo.toUpperCase();
      botonLeer.addEventListener("click", () => abrirDocumento(libro, archivo));
      const botonDescargar = document.createElement("a");
      botonDescargar.className = "boton-libro"; botonDescargar.textContent = "Descargar " + archivo.tipo.toUpperCase();
      botonDescargar.href = archivo.ruta; botonDescargar.download = "";
      grupo.append(botonLeer, botonDescargar); tarjeta.append(grupo);
    });
    contenedor.append(tarjeta);
  });
  mensajeResultados.textContent = listaLibros.length === 1 ? "1 libro encontrado" : `${listaLibros.length} libros encontrados`;
}

function abrirDocumento(libro, archivo) {
  const tipo = String(archivo.tipo).toUpperCase();
  const rutaCompleta = new URL(archivo.ruta, window.location.href).href;
  tituloLector.textContent = "Leyendo: " + libro.titulo + " (" + tipo + ")";
  avisoLector.textContent = "Documento seleccionado: " + tipo + ". Si no se visualiza, descarga el archivo desde su tarjeta.";
  if (tipo === "PDF") {
    visorPdf.src = rutaCompleta;
  } else if (tipo === "DOCX" || tipo === "PPTX") {
    // Office Online necesita que el documento tenga una URL pública accesible desde internet.
    if (window.location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      alert("La lectura integrada de Word y PowerPoint requiere publicar el documento en una dirección pública. La descarga sí está disponible en esta versión local.");
      return;
    }
    visorPdf.src = "https://view.officeapps.live.com/op/embed.aspx?src=" + encodeURIComponent(rutaCompleta);
  } else {
    alert("Este formato todavía no tiene un visor disponible. Puedes descargarlo desde la tarjeta.");
    return;
  }
  lectorLibro.hidden = false;
  document.getElementById("catalogo").hidden = true;
  lectorLibro.scrollIntoView({behavior:"smooth",block:"start"});
}

function cerrarLector() {
  lectorLibro.hidden = true;
  document.getElementById("catalogo").hidden = false;
  visorPdf.src = "about:blank";
  document.getElementById("catalogo").scrollIntoView({behavior:"smooth",block:"start"});
}

function crearPortadaAlternativa(titulo) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820"><rect width="100%" height="100%" fill="#193D36"/><text x="50%" y="45%" text-anchor="middle" font-size="70" fill="#E5D6AC">▤</text><text x="50%" y="60%" text-anchor="middle" font-family="Arial" font-size="30" fill="white">${String(titulo).replace(/[<>&\"']/g, "")}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

buscador.addEventListener("input", aplicarFiltros);
document.getElementById("cerrar-lector").addEventListener("click", cerrarLector);
cargarLibros();
