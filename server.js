const express = require("express");
const mysql = require("mysql2");
const app = express();

const db = mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "Sysadmin@123",
    database: "collegebusmanagement"
});

db.connect((err) => {
    if (err) {
        console.log("MySQL connection failed!");
        console.log(err.message);
        return;
    }

    console.log("MySQL connected successfully!");
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.post("/register", (req, res) => {
    const {
        username,
        rollnumber,
        email,
        phone,
        password,
        confirmPassword,
        role
    } = req.body;

    if (!username || !email || !phone || !password || !confirmPassword || !role) {
        return res.send("Please fill all fields.");
    }

    if (role === "student" && !rollnumber) {
        return res.send("Roll number is required.");
    }

    if (password !== confirmPassword) {
        return res.send("Passwords do not match.");
    }

    const sql = `
        INSERT INTO users (username, email, phone_number, password, role)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [username, email, phone, password, role],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.send("Registration failed.");
            }

            if (role === "student") {
                const studentSql = `
                    INSERT INTO students (user_id, roll_number)
                    VALUES (?, ?)
                `;

                db.query(
                    studentSql,
                    [result.insertId, rollnumber],
                    (err) => {
                        if (err) {
                            console.log(err);
                            return res.send("Student registration failed.");
                        }

                        res.send("Student registration successful!");
                    }
                );
            } else if (role === "admin") {
                const adminSql = `
                    INSERT INTO admins (user_id)
                    VALUES (?)
                `;

                db.query(
                    adminSql,
                    [result.insertId],
                    (err) => {
                        if (err) {
                            console.log(err);
                            return res.send("Admin registration failed.");
                        }

                        res.send("Admin registration successful!");
                    }
                );
            } else if (role === "driver") {
                const driverSql = `
                    INSERT INTO drivers (user_id)
                    VALUES (?)
                `;

                db.query(
                    driverSql,
                    [result.insertId],
                    (err) => {
                        if (err) {
                            console.log(err);
                            return res.send("Driver registration failed.");
                        }

                        res.send("Driver registration successful!");
                    }
                );
            } else {
                res.send("Invalid role.");
            }
        }
    );
});

app.post("/login", (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.send("Please fill all fields.");
    }

    const sql = `
        SELECT * FROM users
        WHERE username = ?
    `;

    db.query(sql, [username], (err, results) => {
        if (err) {
            console.log(err);
            return res.send("Login failed.");
        }

        if (results.length === 0) {
            return res.send(
                "User is not registered. Please Register to continue."
            );
        }

        if (results[0].password !== password) {
            return res.send(
                "Incorrect password. Please check your password and try again."
            );
        }

        if (results[0].role !== role) {
            return res.send(
                "Incorrect role. Please select the correct role."
            );
        }

        if (role === "student") {
            res.redirect("/student-dashboard.html");
        } else if (role === "admin") {
            res.json({
                success: true,
                redirect: "/admin-dashboard.html",
                admin: {
                    name: results[0].username,
                    email: results[0].email,
                    role: "Administrator"
                }
            });
        } else if (role === "driver") {
            res.redirect("/driver-dashboard.html");
        } else {
            res.send("Invalid role.");
        }
    });
});

app.get("/students", (req, res) => {
    const sql = `
        SELECT users.id, users.username, users.email,
        users.phone_number, students.roll_number
        FROM users
        INNER JOIN students
        ON users.id = students.user_id
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Failed to get students."
            });
        }

        res.json(results);
    });
});

app.delete("/students/:id", (req, res) => {
    const userId = req.params.id;

    db.query(
        "DELETE FROM students WHERE user_id = ?",
        [userId],
        (err, result) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to delete student."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Student not found."
                });
            }

            db.query(
                "DELETE FROM users WHERE id = ?",
                [userId],
                (err) => {
                    if (err) {
                        console.log(err);

                        return res.status(500).json({
                            message: "Failed to delete user."
                        });
                    }

                    res.json({
                        message: "Student deleted successfully."
                    });
                }
            );
        }
    );
});

app.put("/students/:id", (req, res) => {
    const userId = req.params.id;

    const {
        username,
        email,
        phone,
        rollnumber
    } = req.body;

    if (!username || !email || !phone || !rollnumber) {
        return res.status(400).json({
            message: "Please fill all student details."
        });
    }

    const userSql = `
        UPDATE users
        SET username = ?, email = ?, phone_number = ?
        WHERE id = ?
    `;

    db.query(
        userSql,
        [username, email, phone, userId],
        (err) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to update student."
                });
            }

            const studentSql = `
                UPDATE students
                SET roll_number = ?
                WHERE user_id = ?
            `;

            db.query(
                studentSql,
                [rollnumber, userId],
                (err) => {
                    if (err) {
                        console.log(err);

                        return res.status(500).json({
                            message: "Failed to update student."
                        });
                    }

                    res.json({
                        message: "Student updated successfully."
                    });
                }
            );
        }
    );
});

app.get("/drivers", (req, res) => {
    const sql = `
        SELECT users.id, users.username, users.email,
        users.phone_number
        FROM users
        INNER JOIN drivers
        ON users.id = drivers.user_id
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Failed to get drivers."
            });
        }

        res.json(results);
    });
});

app.delete("/drivers/:id", (req, res) => {
    const userId = req.params.id;

    db.query(
        "DELETE FROM drivers WHERE user_id = ?",
        [userId],
        (err, result) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to delete driver."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Driver not found."
                });
            }

            db.query(
                "DELETE FROM users WHERE id = ?",
                [userId],
                (err) => {
                    if (err) {
                        console.log(err);

                        return res.status(500).json({
                            message: "Failed to delete user."
                        });
                    }

                    res.json({
                        message: "Driver deleted successfully."
                    });
                }
            );
        }
    );
});

app.put("/drivers/:id", (req, res) => {
    const userId = req.params.id;

    const {
        username,
        email,
        phone
    } = req.body;

    if (!username || !email || !phone) {
        return res.status(400).json({
            message: "Please fill all driver details."
        });
    }

    const sql = `
        UPDATE users
        SET username = ?, email = ?, phone_number = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [username, email, phone, userId],
        (err, result) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to update driver."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Driver not found."
                });
            }

            res.json({
                message: "Driver updated successfully."
            });
        }
    );
});

app.get("/buses", (req, res) => {
    const sql = `
        SELECT id, bus_number, registration_number, capacity, status
        FROM buses
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Failed to get buses."
            });
        }

        res.json(results);
    });
});

app.post("/buses", (req, res) => {
    const {
        bus_number,
        registration_number,
        capacity,
        status
    } = req.body;

    if (!bus_number || !registration_number || !capacity || !status) {
        return res.status(400).json({
            message: "Please fill all bus details."
        });
    }

    const sql = `
        INSERT INTO buses
        (bus_number, registration_number, capacity, status)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            bus_number,
            registration_number,
            capacity,
            status
        ],
        (err, result) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to add bus."
                });
            }

            res.json({
                message: "Bus added successfully.",
                id: result.insertId
            });
        }
    );
});

app.put("/buses/:id", (req, res) => {
    const busId = req.params.id;

    const {
        bus_number,
        registration_number,
        capacity,
        status
    } = req.body;

    if (!bus_number || !registration_number || !capacity || !status) {
        return res.status(400).json({
            message: "Please fill all bus details."
        });
    }

    const sql = `
        UPDATE buses
        SET bus_number = ?,
            registration_number = ?,
            capacity = ?,
            status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            bus_number,
            registration_number,
            capacity,
            status,
            busId
        ],
        (err, result) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to update bus."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Bus not found."
                });
            }

            res.json({
                message: "Bus updated successfully."
            });
        }
    );
});

app.delete("/buses/:id", (req, res) => {
    const busId = req.params.id;

    const sql = `
        DELETE FROM buses
        WHERE id = ?
    `;

    db.query(
        sql,
        [busId],
        (err, result) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to delete bus."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Bus not found."
                });
            }

            res.json({
                message: "Bus deleted successfully."
            });
        }
    );
});

app.get("/routes", (req, res) => {
    const sql = `
        SELECT id, route_name, bus_number, start_point, end_point, stops, status
        FROM routes
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Failed to get routes."
            });
        }

        res.json(results);
    });
});

app.post("/routes", (req, res) => {
    const {
        route_name,
        bus_number,
        start_point,
        end_point,
        stops,
        status
    } = req.body;

    if (
        !route_name ||
        !bus_number ||
        !start_point ||
        !end_point ||
        !stops ||
        !status
    ) {
        return res.status(400).json({
            message: "Please fill all route details."
        });
    }

    const sql = `
        INSERT INTO routes
        (route_name, bus_number, start_point, end_point, stops, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            route_name,
            bus_number,
            start_point,
            end_point,
            stops,
            status
        ],
        (err, result) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to add route."
                });
            }

            res.json({
                message: "Route added successfully.",
                id: result.insertId
            });
        }
    );
});

app.put("/routes/:id", (req, res) => {
    const routeId = req.params.id;

    const {
        route_name,
        bus_number,
        start_point,
        end_point,
        stops,
        status
    } = req.body;

    if (
        !route_name ||
        !bus_number ||
        !start_point ||
        !end_point ||
        !stops ||
        !status
    ) {
        return res.status(400).json({
            message: "Please fill all route details."
        });
    }

    const sql = `
        UPDATE routes
        SET route_name = ?,
            bus_number = ?,
            start_point = ?,
            end_point = ?,
            stops = ?,
            status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            route_name,
            bus_number,
            start_point,
            end_point,
            stops,
            status,
            routeId
        ],
        (err, result) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to update route."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Route not found."
                });
            }

            res.json({
                message: "Route updated successfully."
            });
        }
    );
});

app.delete("/routes/:id", (req, res) => {
    const routeId = req.params.id;

    const sql = `
        DELETE FROM routes
        WHERE id = ?
    `;

    db.query(
        sql,
        [routeId],
        (err, result) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to delete route."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Route not found."
                });
            }

            res.json({
                message: "Route deleted successfully."
            });
        }
    );
});

app.get("/dashboard-stats", (req, res) => {
    const studentSql = `
        SELECT COUNT(*) AS totalStudents
        FROM students
    `;

    const driverSql = `
        SELECT COUNT(*) AS totalDrivers
        FROM drivers
    `;

    const busSql = `
        SELECT COUNT(*) AS totalBuses
        FROM buses
    `;

    const routeSql = `
        SELECT COUNT(*) AS totalRoutes
        FROM routes
    `;

    db.query(studentSql, (err, studentResult) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                message: "Failed to get student count."
            });
        }

        db.query(driverSql, (err, driverResult) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    message: "Failed to get driver count."
                });
            }

            db.query(busSql, (err, busResult) => {
                if (err) {
                    console.log(err);

                    return res.status(500).json({
                        message: "Failed to get bus count."
                    });
                }

                db.query(routeSql, (err, routeResult) => {
                    if (err) {
                        console.log(err);

                        return res.status(500).json({
                            message: "Failed to get route count."
                        });
                    }

                    res.json({
                        students: studentResult[0].totalStudents,
                        drivers: driverResult[0].totalDrivers,
                        buses: busResult[0].totalBuses,
                        routes: routeResult[0].totalRoutes
                    });
                });
            });
        });
    });
});

app.get("/notifications", (req, res) => {
    const sql = `
        SELECT *
        FROM notifications
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                success: false,
                message: "Failed to load notifications."
            });
        }

        res.json(results);
    });
});

app.post("/notifications", (req, res) => {
    const {
        title,
        message,
        type,
        status
    } = req.body;

    if (!title || !message || !type || !status) {
        return res.status(400).json({
            success: false,
            message: "Please fill all fields."
        });
    }

    const sql = `
        INSERT INTO notifications
        (title, message, type, status)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            title,
            message,
            type,
            status
        ],
        (err, result) => {
            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to create notification."
                });
            }

            res.json({
                success: true,
                message: "Notification created successfully.",
                id: result.insertId
            });
        }
    );
});

app.delete("/notifications/:id", (req, res) => {
    const id = req.params.id;

    const sql = `
        DELETE FROM notifications
        WHERE id = ?
    `;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.log(err);

            return res.status(500).json({
                success: false,
                message: "Failed to delete notification."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found."
            });
        }

        res.json({
            success: true,
            message: "Notification deleted successfully."
        });
    });
});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});