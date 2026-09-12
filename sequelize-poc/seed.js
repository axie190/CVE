// seed.js
// DB 초기화하고 테스트용 더미데이터 넣는 스크립트
// node seed.js 하면 data.sqlite가 새로 만들어지고 아래 데이터가 채워짐

const { sequelize, User, Post, Secret } = require('./models');

async function main() {
  // force: true 로 하면 테이블 다 지우고 새로 만들고 매번 깨끗한 상태에서 테스트 진행
  await sequelize.sync({ force: true });

  await User.bulkCreate([
    { username: 'tae-hyun', password: 'mypassword1' },
    { username: 'visitor1', password: '1234' },
  ]);

  await Post.bulkCreate([
    { title: 'Sequelize 과제 시작합니다', author: 'tae-hyun', content: '오늘부터 CVE-2023-25813 분석 시작', password: 'qwer1234', isSecret: false, views: 3 },
    { title: '게시판 기능 정리', author: 'tae-hyun', content: '로그인/비밀글/삭제까지 board 기능 참고해서 구현 예정', password: 'qwer1234', isSecret: false, views: 5 },
    { title: '질문있습니다', author: 'visitor1', content: 'replacements 옵션 어디서 쓰이나요?', password: '1234', isSecret: false, views: 1 },
    // 비밀글: 제목 + 비밀번호가 둘 다 맞아야 content가 보여야 정상 (board의 verify_password 개념과 동일)
    { title: '개인 메모', author: 'tae-hyun', content: '이건 비밀번호를 알아야만 보이는 내용입니다', password: 'secretpw1', isSecret: true, views: 0 },
  ]);

  // 정상적인 경로로는 절대 조회되면 안 되는 값
  // SQLi 터졌는지 확인용 데이터
  await Secret.bulkCreate([
    { label: 'admin_password_hash', value: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' },
  ]);

  console.log('시드 완료');
  await sequelize.close();
}

main().catch((err) => {
  console.log(err);
  process.exit(1);
});