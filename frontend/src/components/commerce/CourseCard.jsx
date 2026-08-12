import { Link } from "react-router-dom";
import { ArrowIcon } from "../common/Icons.jsx";

export function CourseCard({ course }) {
  return (
    <article className="course-card">
      <Link className="course-card-image" to={`/cursos/${course.slug}`}>
        {course.image ? (
          <img src={course.image.url} alt={course.image.alt} loading="lazy" />
        ) : (
          <div className="course-image-placeholder">
            <span>Imagem em preparação</span>
          </div>
        )}
      </Link>
      <div>
        <p className="eyebrow">Curso</p>
        <h2>
          <Link to={`/cursos/${course.slug}`}>{course.name}</Link>
        </h2>
        {course.summary && <p>{course.summary}</p>}
        <Link className="text-link" to={`/cursos/${course.slug}`}>
          Conhecer curso <ArrowIcon />
        </Link>
      </div>
    </article>
  );
}
