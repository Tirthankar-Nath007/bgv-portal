const oracledb = require("oracledb");

async function testConnection() {
  let connection;

  try {
    connection = await oracledb.getConnection({
      user: "DEV_5077947",
      password: "Deadlock@123",
      connectString: `
        (DESCRIPTION=
          (ADDRESS=(PROTOCOL=TCP)(HOST=10.223.0.13)(PORT=1521))
          (CONNECT_DATA=
            (SERVICE_NAME=APIUAPDB.uatdbprvsnt.uatvcn.oraclevcn.com)
          )
        )`
    });

    console.log("✅ Successfully connected to Oracle DB");

    // Optional: run a test query
    const result = await connection.execute(
      `SELECT SYSDATE FROM DUAL`
    );

    console.log("DB Time:", result.rows[0][0]);

  } catch (err) {
    console.error("❌ Connection failed");
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection", err);
      }
    }
  }
}

testConnection();