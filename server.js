// server.js
// 실제 포트폴리오 board(Flask)에 있는 로그인, 비밀글 확인 로직을 그대로 참고해서 Node.js + Sequelize로 새로 개발
// 원본은 %s 자리표시자로 안전하게 짰지만, 여긴 과제 목적상 일부러 취약하게 짬

const express = require('express');
const { Sequelize, Op } = require('sequelize');
const { sequelize, User, Post } = require('./models');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public')); // public 폴더 안에 있는 index.html 그대로 보여줌

// ------------------------------------------------------------------
// 기능 1: 로그인 (아이디 + 비밀번호)
// GET /api/login?username=tae-hyun&password=mypassword1
// 여기가 이번 과제의 취약점(CVE-2023-25813)이 들어있는 부분
// where 절 안에서 Sequelize.literal()을 쓰면서 동시에 replacements 옵션도 같이 쓰고 있는데 이 조합이 문제
// ------------------------------------------------------------------
app.get('/api/login', async (req, res) => {
  const username = req.query.username || '';
  const password = req.query.password || '';

  try {
    const rows = await User.findAll({
      where: {
        [Op.and]: [
          // :username 자리에 아래 replacements에서 넘긴 값이 그대로 들어감
          Sequelize.literal(`username = :username`),
          // password 조건은 그냥 평범하게 짠 조건인데 공격자가 password 값을 일부러 ":username" 이라는 문자열로 넣으면 문제가 생김
          { password: password },
        ],
      },
      replacements: { username: username },
    });
    res.json(rows);
  } catch (err) {
    // 에러를 그대로 보여주는건 실서비스에선 하면 안 되는 거지만 지금은 어떤 에러가 나는지 확인하기 위함
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// 게시글 목록 조회 (검색 없이 그냥 전체 목록만 보여줌 — board의 list_posts에서 검색 부분은 과제에서 제외 대상이라 안 넣었고 목록 자체만 가져옴)
// GET /api/posts
// 이건 where절 자체가 없어서 취약점이랑 무관한 안전한 경로
// ------------------------------------------------------------------
app.get('/api/posts', async (req, res) => {
  try {
    const rows = await Post.findAll({ order: [['id', 'DESC']] });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 회원가입 (그냥 create()만 씀 replacements 안 쓰니까 안전한 경로)
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const row = await User.create({ username, password });
    res.json({ id: row.id, username: row.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 글쓰기 (그냥 create()만 씀 안전한 경로)
app.post('/api/posts', async (req, res) => {
  const { title, author, content, password, isSecret } = req.body;

  try {
    const row = await Post.create({ title, author, content, password, isSecret: !!isSecret });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// 기능 2: 비밀글 조회 (제목 + 비밀번호가 둘 다 맞아야 content가 보여야 정상)
// GET /api/posts/secret?title=개인 메모&password=아무거나
// board의 verify_password(action=view)를 참고해서 만듦
// 원본은 id로 글을 찾고 password_hash를 check_password_hash로 비교하는데 여긴 그 확인 로직을 Sequelize where 절 하나로 합쳐서 짬 로그인이랑 똑같이 [Op.and]로 짰는데 결국 같은 이유로 뚫림
// ------------------------------------------------------------------
app.get('/api/posts/secret', async (req, res) => {
  const title = req.query.title || '';
  const password = req.query.password || '';

  try {
    const rows = await Post.findAll({
      where: {
        [Op.and]: [
          Sequelize.literal(`title = :title`),
          { password: password }, // 여기 password 값도 로그인 쪽이랑 똑같은 문제가 생김
        ],
      },
      replacements: { title: title },
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// 기능 3: 게시글 삭제 (제목 + 비밀번호 확인 후 삭제)
// POST /api/posts/delete   body: { title, password }
// board의 verify_password(action=delete)를 참고함 — 원본은 비밀번호가 맞아야 DELETE FROM posts가 실행됨 
// 여긴 기능 2랑 완전히 똑같은 조회 로직으로 글을 찾은 다음 그 글을 지우는 식으로 구성 
// 조회 자체가 뚫리니까 비밀번호를 몰라도 아무 글이나 지울 수 있게 됨 — 단순 정보 노출이 아니라 데이터 파괴까지 가능한 경우
// ------------------------------------------------------------------
app.post('/api/posts/delete', async (req, res) => {
  const title = req.body.title || '';
  const password = req.body.password || '';

  try {
    const rows = await Post.findAll({
      where: {
        [Op.and]: [
          Sequelize.literal(`title = :title`),
          { password: password },
        ],
      },
      replacements: { title: title },
    });

    for (const row of rows) {
      await row.destroy();
    }

    res.json({ deletedCount: rows.length, deletedTitles: rows.map((r) => r.title) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 게시글 상세 조회. 비밀글이면 content는 안 담아서 보내고, 프론트에서 잠금 화면을 보여줌
// 이것도 id로만 찾는 단순 조회라 취약점이랑 무관함
// 이 라우트는 꼭 맨 아래에 둬야 함 — /api/posts/:id 가 위쪽에 있으면 "secret"이나 "delete"도 :id 자리에 걸려서 저 위에 있는 진짜 라우트들이 실행이 안 됨 (express는 등록한 순서대로 매칭함)
app.get('/api/posts/:id', async (req, res) => {
  try {
    const row = await Post.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ error: '글을 찾을 수 없습니다.' });
    }
    const data = row.toJSON();
    if (data.isSecret) {
      delete data.content; // 비밀글이면 여기서는 내용을 아예 안 줌
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log('listening on ' + PORT);
});