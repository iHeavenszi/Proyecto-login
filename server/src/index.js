const express = require("express");
const morgan = require("morgan");
const database = require("./database");
const bodyParser = require("body-parser");

// Configuración inicial
const app = express();
app.set("port", 4000);

// Middlewares
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(express.json());


// Endpoints

//Obtener todos los clientes
app.get("/clientes", async (req, res) => {
  const { nombre, apellido, telefono, direccion, page = 1, limit = 10 } = req.query;

  // Construcción dinámica de la consulta SQL
  let query = "SELECT * FROM clientes WHERE 1=1"; 
  const params = [];

  // Agregar filtros dinámicamente, solo si el parámetro está presente
  if (nombre) {
    query += " AND nombre LIKE ?";
    params.push(`%${nombre}%`);
  }
  if (apellido) {
    query += " AND apellido LIKE ?";
    params.push(`%${apellido}%`);
  }
  if (telefono) {
    query += " AND telefono LIKE ?";
    params.push(`%${telefono}%`);
  }
  if (direccion) {
    query += " AND direccion LIKE ?";
    params.push(`%${direccion}%`);
  }

  // Asegúrate de que limit y page son números
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  // Calcular el offset
  const offset = (pageNum - 1) * limitNum;

  // Agregar la paginación a la consulta
  query += " LIMIT ? OFFSET ?";
  params.push(limitNum, offset);

  try {
    const connection = await database.getConnection();
    // Ejecutar la consulta con los filtros aplicados
    const result = await connection.query(query, params);

    // Obtener el total de registros que coinciden con la búsqueda
    const countQuery = `SELECT COUNT(*) as total FROM clientes WHERE 1=1 ${nombre ? "AND nombre LIKE ?" : ""} ${apellido ? "AND apellido LIKE ?" : ""} ${telefono ? "AND telefono LIKE ?" : ""} ${direccion ? "AND direccion LIKE ?" : ""}`;
    const countParams = [
      ...params.slice(0, -2) // Parámetros para los filtros sin el LIMIT y OFFSET
    ];

    const countResult = await connection.query(countQuery, countParams); 

    // Calcular el total de páginas
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limitNum);

    res.json({
      data: result, // Los datos de los clientes encontrados
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,  // Total de registros filtrados (por nombre, apellido, etc.)
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los clientes", error });
  }
});

//Obtener un cliente por ID
app.get("/clientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await database.getConnection();
    const result = await connection.query("SELECT * FROM clientes WHERE id_cliente = ?", [id]);
    if (result.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener cliente", error });
  }
});

//Crear un cliente
app.post("/clientes", async (req, res) => {
  try {
    const { nombre, apellido, email, telefono, direccion } = req.body;
    const connection = await database.getConnection();
    const result = await connection.query(
      "INSERT INTO clientes (nombre, apellido, email, telefono, direccion, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [nombre, apellido, email, telefono, direccion]
    );
    res.status(201).json({ message: "Cliente creado", id_cliente: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Error al crear cliente", error });
  }
});

//Actualizar un cliente
app.put("/clientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, direccion } = req.body;
    const connection = await database.getConnection();
    const result = await connection.query(
      "UPDATE clientes SET nombre = ?, apellido = ?, email = ?, telefono = ?, direccion = ?, updated_at = NOW() WHERE id_cliente = ?",
      [nombre, apellido, email, telefono, direccion, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json({ message: "Cliente actualizado" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar cliente", error });
  }
});

//Eliminar un cliente
app.delete("/clientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await database.getConnection();
    const result = await connection.query("DELETE FROM clientes WHERE id_cliente = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json({ message: "Cliente eliminado" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar cliente", error });
  }
});

//pedidos
//obtener todos los pedidos
app.get("/ordenes", async (req, res) => {
  const { id_cliente, fecha, page = 1, limit = 10 } = req.query;

  let query = "SELECT * FROM ordenes WHERE 1=1";
  const params = [];

  if (id_cliente) {
    query += " AND id_cliente = ?";
    params.push(id_cliente);
  }

  if (fecha) {
    query += " AND fecha = ?";
    params.push(fecha);
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  query += " LIMIT ? OFFSET ?";
  params.push(limitNum, offset);

  try {
    const connection = await database.getConnection();

    // Obtener los pedidos
    const result = await connection.query(query, params);

    // Contar los pedidos totales según los filtros aplicados
    const countQuery = `SELECT COUNT(*) as total FROM ordenes WHERE 1=1 ${id_cliente ? "AND id_cliente = ?" : ""} ${fecha ? "AND fecha = ?" : ""}`;
    const countParams = id_cliente ? [id_cliente, fecha].filter(Boolean) : [fecha].filter(Boolean);
    const countResult = await connection.query(countQuery, countParams);

    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limitNum);

    res.json({
      data: result,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las órdenes", error });
  }
});

//crear pedidos
app.post("/ordenes", async (req, res) => {
  const { fecha, total, id_cliente } = req.body;

  if (!fecha || !total || !id_cliente) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  try {
    const connection = await database.getConnection();
    const result = await connection.query(
      "INSERT INTO ordenes (fecha, total, id_cliente) VALUES (?, ?, ?)",
      [fecha, total, id_cliente]
    );
    res.status(201).json({ message: "Orden creada", id_orden: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Error al crear la orden", error });
  }
});

//obtener pedido por id
app.get("/ordenes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await database.getConnection();
    const result = await connection.query("SELECT * FROM ordenes WHERE id_orden = ?", [id]);

    if (result.length === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la orden", error });
  }
});
//actualizar por id
app.put("/ordenes/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha, total, id_cliente } = req.body;

  if (!fecha || !total || !id_cliente) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  try {
    const connection = await database.getConnection();
    const result = await connection.query(
      "UPDATE ordenes SET fecha = ?, total = ?, id_cliente = ? WHERE id_orden = ?",
      [fecha, total, id_cliente, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    res.json({ message: "Orden actualizada" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar la orden", error });
  }
});

//eliminar
app.delete("/ordenes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await database.getConnection();
    const result = await connection.query("DELETE FROM ordenes WHERE id_orden = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    res.json({ message: "Orden eliminada" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la orden", error });
  }
});

//productos
//obtener todos
app.get("/productos", async (req, res) => {
  const { nombre, categoria, page = 1, limit = 10 } = req.query;

  let query = "SELECT * FROM productos WHERE 1=1";
  const params = [];

  if (nombre) {
    query += " AND nombre LIKE ?";
    params.push(`%${nombre}%`);
  }

  if (categoria) {
    query += " AND categoria = ?";
    params.push(categoria);
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  query += " LIMIT ? OFFSET ?";
  params.push(limitNum, offset);

  try {
    const connection = await database.getConnection();

    // Obtener los productos
    const result = await connection.query(query, params);

    // Contar los productos totales según los filtros aplicados
    const countQuery = `SELECT COUNT(*) as total FROM productos WHERE 1=1 ${nombre ? "AND nombre LIKE ?" : ""} ${categoria ? "AND categoria = ?" : ""}`;
    const countParams = nombre ? [`%${nombre}%`, categoria].filter(Boolean) : [categoria].filter(Boolean);
    const countResult = await connection.query(countQuery, countParams);

    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limitNum);

    res.json({
      data: result,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los productos", error });
  }
});

//crear
app.post("/productos", async (req, res) => {
  const { nombre, descripcion, precio, stock, categoria } = req.body;

  if (!nombre || !descripcion || !precio || !stock || !categoria) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  try {
    const connection = await database.getConnection();
    const result = await connection.query(
      "INSERT INTO productos (nombre, descripcion, precio, stock, categoria) VALUES (?, ?, ?, ?, ?)",
      [nombre, descripcion, precio, stock, categoria]
    );
    res.status(201).json({ message: "Producto creado", id_producto: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Error al crear el producto", error });
  }
});

//buscar por id
app.get("/productos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await database.getConnection();
    const result = await connection.query("SELECT * FROM productos WHERE id_producto = ?", [id]);

    if (result.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el producto", error });
  }
});

//actualizar
app.put("/productos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock, categoria } = req.body;

  if (!nombre || !descripcion || !precio || !stock || !categoria) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  try {
    const connection = await database.getConnection();
    const result = await connection.query(
      "UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, categoria = ? WHERE id_producto = ?",
      [nombre, descripcion, precio, stock, categoria, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({ message: "Producto actualizado" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el producto", error });
  }
});

//eliminar
app.delete("/productos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await database.getConnection();
    const result = await connection.query("DELETE FROM productos WHERE id_producto = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({ message: "Producto eliminado" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el producto", error });
  }
});



//Iniciar servidor
app.listen(app.get("port"), () => {
  console.log("Servidor corriendo en el puerto " + app.get("port"));
});
