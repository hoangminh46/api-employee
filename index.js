const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const usersData = JSON.parse(fs.readFileSync("users.json", "utf-8"));

// Phương thức đăng nhập
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Tìm người dùng trong mảng
  const user = usersData.users.find((user) => user.username === username);
  if (!user) {
    return res
      .status(401)
      .json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
  }

  // Kiểm tra mật khẩu
  if (password !== user.password) {
    return res
      .status(401)
      .json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
  }

  // Tạo mã thông báo (token)
  const token = jwt.sign(user, "secret_key");

  return res.status(200).json({ message: "Đăng nhập thành công", token });
});

// Middleware xác thực token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, "secret_key", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Lấy thông tin người dùng
app.get("/users", (req, res) => {
  const users = usersData.users;
  res.json(users);
});

// Thêm người dùng
app.post("/users", (req, res) => {
  const newUser = req.body;

  // Kiểm tra xem tên đăng nhập đã tồn tại chưa
  const existingUser = usersData.users.find(
    (user) => user.username === newUser.username
  );
  if (existingUser) {
    return res.status(409).json({
      message: {
        type: 1,
        text: "Tên đăng nhập đã tồn tại",
      },
    });
  }

  // Lưu người dùng mới vào mảng
  usersData.users.push(newUser);

  fs.writeFileSync("users.json", JSON.stringify(usersData, null, 4));
  return res.status(201).json({
    message: {
      type: 2,
      text: "Người dùng đã được tạo",
    },
    user: newUser,
  });
});

//Sửa người dùng

app.put("/users/:id", (req, res) => {
  const userId = req.params.id;
  const updatedUser = req.body;
  const users = usersData.users;

  // Tìm người dùng cần sửa
  const userIndex = users.findIndex((user) => user.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({
      message: {
        type: 1,
        text: "Không tìm thấy người dùng",
      },
    });
  }
  // Kiểm tra xem username và email có tồn tại không

  const newArrUser = users.filter((user) => {
    return user.id !== userId;
  });

  const existingUsername = newArrUser.find(
    (user) => user.username === updatedUser.username && user.id !== userId
  );
  if (existingUsername) {
    return res.status(400).json({
      message: {
        type: 1,
        text: "Username đã tồn tại",
      },
    });
  }

  const existingEmail = newArrUser.find(
    (user) => user.email === updatedUser.email && user.id !== userId
  );
  if (existingEmail) {
    return res.status(400).json({
      message: {
        type: 1,
        text: "Email đã tồn tại",
      },
    });
  }

  // Cập nhật thông tin người dùng
  users[userIndex] = {
    ...users[userIndex],
    username: updatedUser.username || users[userIndex].username,
    name: updatedUser.name || users[userIndex].name,
    email: updatedUser.email || users[userIndex].email,
    password: updatedUser.password || users[userIndex].password,
    role: updatedUser.role || users[userIndex].role,
    division: updatedUser.division || users[userIndex].division,
    position: updatedUser.position || users[userIndex].position,
    phone: updatedUser.phone || users[userIndex].phone,
    address: updatedUser.address || users[userIndex].address,
    love: updatedUser.love || users[userIndex].love,
    gender: updatedUser.gender || users[userIndex].gender,
  };

  const newUser = users[userIndex];
  fs.writeFileSync("users.json", JSON.stringify(usersData, null, 4));
  return res.status(200).json({
    message: {
      type: 2,
      text: "Cập nhật thông tin thành công",
    },
    newUser,
  });
});

//Xoá người dùng
app.delete("/users/:id", (req, res) => {
  const userId = req.params.id;

  // Tìm index của người dùng trong mảng
  const userIndex = usersData.users.findIndex((user) => user.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ message: "Người dùng không tồn tại" });
  }

  // Xoá người dùng khỏi mảng
  const deletedUser = usersData.users.splice(userIndex, 1)[0];
  fs.writeFileSync("users.json", JSON.stringify(usersData, null, 4));
  return res
    .status(200)
    .json({ message: "Người dùng đã được xoá", user: deletedUser });
});

app.post("/attendance", (req, res) => {
  const { userId, attendanceId, day, month, year, checkIn } = req.body;

  // Tìm nhân viên có ID tương ứng
  const user = usersData.users.find((user) => user.id === userId);

  if (!user) {
    return res.status(404).json({ error: "Employee not found" });
  }

  // Tạo dữ liệu attendance mới
  const newAttendance = {
    id: attendanceId,
    day,
    month,
    year,
    checkIn,
    checkOut: "",
    total: 0,
  };

  // Thêm dữ liệu attendance mới vào danh sách
  user.attendance.push(newAttendance);
  fs.writeFileSync("users.json", JSON.stringify(usersData, null, 4));
  res.status(201).json(newAttendance);
});

app.put("/users/:userId/attendance/:attendanceId", (req, res) => {
  const { userId, attendanceId, checkOut } = req.body;

  // Tìm và cập nhật trường checkOut
  const userIndex = usersData.users.findIndex((user) => user.id === userId);
  if (userIndex !== -1) {
    const attendanceIndex = usersData.users[userIndex].attendance.findIndex(
      (item) => item.id === attendanceId
    );
    if (attendanceIndex !== -1) {
      usersData.users[userIndex].attendance[attendanceIndex].checkOut =
        checkOut;
      fs.writeFileSync("users.json", JSON.stringify(usersData, null, 4));
      res.json(usersData.users[userIndex].attendance[attendanceIndex]);
    } else {
      res.status(404).json({ error: "Không tìm thấy ngày trong dữ liệu" });
    }
  } else {
    res.status(404).json({ error: "Không tìm thấy người dùng trong dữ liệu" });
  }
});

// Thêm tổng thời gian làm việc trong ngày
app.put("/users/:userId/attendance/:attendanceId/total", (req, res) => {
  const { userId, attendanceId } = req.body;
  const user = usersData.users.find((u) => u.id === userId);

  const attendance = user.attendance.find((a) => a.id === attendanceId);

  const [checkInHours, checkInMinutesTemp] = attendance.checkIn
    .split(":")
    .map(Number);
  const [checkOutHours, checkOutMinutesTemp] = attendance.checkOut
    .split(":")
    .map(Number);

  const checkInMinutes = checkInHours * 60 + checkInMinutesTemp;
  const checkOutMinutes = checkOutHours * 60 + checkOutMinutesTemp;

  let totalMinutes = checkOutMinutes - checkInMinutes;

  // Trừ thêm 1:30 nếu checkOut lớn hơn hoặc bằng 13:30
  if (
    checkOutHours >= 13 &&
    checkOutMinutes >= 30 &&
    checkInHours <= 12 &&
    checkOutMinutes == 0
  ) {
    totalMinutes -= 90; // 1:30 = 90 phút
  }

  attendance.total = totalMinutes;
  fs.writeFileSync("users.json", JSON.stringify(usersData, null, 4));
  res.json(attendance);
});

// Ví dụ về một tài nguyên cần xác thực token
app.get("/protected", authenticateToken, (req, res) => {
  // Kiểm tra quyền truy cập dựa trên vai trò của người dùng
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Bạn không có quyền truy cập" });
  }

  return res
    .status(200)
    .json({ message: "Truy cập thành công vào tài nguyên được bảo vệ" });
});

// Reset password via email
app.post("/reset-password", (req, res) => {
  const { email } = req.body;
  const user = usersData.users.find((user) => user.email === email);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Generate a new password
  const newPassword = Math.random().toString(36).slice(2, 10);

  // Update the user's password in the data structure
  user.password = newPassword;

  fs.writeFileSync("users.json", JSON.stringify(usersData, null, 4));

  // Set up email transporter using the built-in nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "hoangcongminh406@gmail.com", // Replace with your email
      pass: "upks ydcl txhr ezno", // Replace with your email password
    },
  });

  // Define email options
  const mailOptions = {
    from: "hoangcongminh406@gmail.com", // Replace with your email
    to: user.email,
    subject: "New Password",
    text: `Your new password is: ${newPassword}`,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return res.status(500).json({ error: "Failed to send email" });
    } else {
      console.log("Email sent: " + info.response);
      return res.status(200).json({ message: "New password sent to email" });
    }
  });
});

// Khởi chạy server
app.listen(3000, () => {
  console.log("Server đang chạy trên cổng 3000");
});
