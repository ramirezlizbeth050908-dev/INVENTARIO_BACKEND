// archivo de configuración de la base de datos 
import connect from "../middlewares/db.mjs"; 

// 🔍 Obtener todos los productos
async function obtenerRegistros() { 
    const db = await connect(); 

    try { 
        const [rows] = await db.execute("SELECT * FROM productos"); 
        return rows; 
    } catch (error) { 
        console.error("Error al obtener registros:", error); 
        throw new Error("Ocurrió un error al intentar obtener los datos"); 
    } finally { 
        db.end(); 
    } 
} 

// ➕ Crear producto
async function crearRegistro(nombre) { 
    const db = await connect(); 

    try { 
        const [result] = await db.execute(
            "INSERT INTO productos (nombre) VALUES (?)", 
            [nombre]
        ); 

        console.log("Insertado:", result); 
        return "OK"; 
    } catch (error) { 
        console.error("Error al insertar:", error); 
        throw new Error("Ocurrió un error al intentar agregar registros"); 
    } finally { 
        db.end(); 
    } 
} 

// ✏️ Editar producto
async function editarRegistro(id, nombre) { 
    const db = await connect(); 

    try { 
        const [result] = await db.execute(
            "UPDATE productos SET nombre = ? WHERE id = ?", 
            [nombre, id]
        ); 

        console.log("Editado:", result); 
        return "OK"; 
    } catch (error) { 
        console.error("Error al editar:", error); 
        throw new Error("Ocurrió un error al intentar editar registros"); 
    } finally { 
        db.end(); 
    } 
} 

// 🗑️ Eliminar producto
async function eliminarRegistro(id) { 
    const db = await connect(); 

    try { 
        const [result] = await db.execute(
            "DELETE FROM productos WHERE id = ?", 
            [id]
        ); 

        console.log("Eliminado:", result); 
        return "OK"; 
    } catch (error) { 
        console.error("Error al eliminar:", error); 
        throw new Error("Ocurrió un error al intentar eliminar registros"); 
    } finally { 
        db.end(); 
    } 
} 

export default { 
    obtenerRegistros, 
    crearRegistro, 
    editarRegistro, 
    eliminarRegistro 
};