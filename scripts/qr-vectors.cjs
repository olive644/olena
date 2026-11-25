
const qrcode=require("qrcode-generator");
const fs=require("fs");
const cases=[
 ["https://olenastudy.app/perfil","M"],
 ["https://olenastudy.app/perfil?usuario=oliver644","H"],
 ["https://olenastudy.app/perfil?usuario=oliver644","M"],
 ["https://olenastudy.app/perfil?usuario=a.b_c","H"],
 ["A","M"],["A","H"],
 ["https://olenastudy.app/perfil?usuario="+"x".repeat(30),"H"],
 ["https://olenastudy.app/perfil?usuario="+"y".repeat(30),"M"],
 ["h".repeat(100),"M"],["h".repeat(100),"H"],
 ["0123456789".repeat(14),"M"],["z".repeat(150),"M"],
 ["abc".repeat(38),"H"],["q".repeat(213),"M"],
];
let out=`package olenastudy.app.domain.qr

/** Vetores gerados com a biblioteca qrcode-generator do site (scripts/qr-vectors.cjs). Não editar à mão. */
object QrVectors {
    class Vector(val text: String, val level: QrLevel, val version: Int, val rows: List<String>)

    val all = listOf(
`;
for(const [t,l] of cases){
 const q=qrcode(0,l);q.addData(t);q.make();const n=q.getModuleCount();
 const rows=[];for(let r=0;r<n;r++){let s="";for(let c=0;c<n;c++)s+=q.isDark(r,c)?"1":"0";rows.push(s);}
 out+=`        Vector(\n            ${JSON.stringify(t)},\n            QrLevel.${l},\n            ${(n-17)/4},\n            listOf(\n${rows.map(r=>`                "${r}",`).join("\n")}\n            ),\n        ),\n`;
}
out+="    )\n}\n";
fs.writeFileSync(process.argv[2] ?? "android/app/src/test/java/olenastudy/app/domain/qr/QrVectors.kt",out);
console.log("ok",cases.length);
