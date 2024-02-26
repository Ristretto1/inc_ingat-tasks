import request from 'supertest';
import { app } from '../src/settings';
import { AppRouterPath, HTTP_STATUSES } from '../src/models/common.types';
import { ICreatePost } from '../src/models/posts/input.types';
import { IBlogDB, IPostDB } from '../src/models/db/db.types';
import { MongoClient } from 'mongodb';
import { IBlogOutput } from '../src/models/blogs/output.types';
import { IPostOutput } from '../src/models/posts/output.types';

const route = AppRouterPath.posts;
const uri = process.env.LOCAL_URI || 'mongodb://localhost:27017';

let blog: IBlogOutput;

describe(route, () => {
  const client = new MongoClient(uri);

  beforeAll(async () => {
    await client.connect();
    await request(app)
      .delete(`${AppRouterPath.testing}/all-data`)
      .expect(HTTP_STATUSES.NO_CONTENT_204);

    const res = await request(app)
      .post(AppRouterPath.blogs)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send({
        description: 'new description2',
        name: 'new name2',
        websiteUrl: 'https://someurl2.com',
      })
      .expect(HTTP_STATUSES.CREATED_201);

    blog = res.body;
  });

  afterAll(async () => {
    await request(app)
      .delete(`${AppRouterPath.testing}/all-data`)
      .expect(HTTP_STATUSES.NO_CONTENT_204);
    await client.close();
  });

  it('+ GET all items = []', async () => {
    await request(app).get(route).expect(HTTP_STATUSES.OK_200, {
      items: [],
      page: 1,
      pagesCount: 0,
      pageSize: 10,
      totalCount: 0,
    });
  });

  // -- INCORRECT ID -- //
  it('- PUT item with incorrect id', async () => {
    const data: ICreatePost = {
      blogId: blog.id,
      content: 'new content1',
      shortDescription: 'new shortDescription1',
      title: 'new title1',
    };

    await request(app)
      .put(`${route}/-100`)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data)
      .expect(HTTP_STATUSES.NOT_FOUND_404);
  });
  it('- DELETE item with incorrect id', async () => {
    await request(app)
      .delete(`${route}/-100`)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .expect(HTTP_STATUSES.NOT_FOUND_404);
    await request(app).get(route).expect(HTTP_STATUSES.OK_200, {
      items: [],
      page: 1,
      pagesCount: 0,
      pageSize: 10,
      totalCount: 0,
    });
  });
  it('- GET item with incorrect id', async () => {
    await request(app).get(`${route}/100`).expect(HTTP_STATUSES.NOT_FOUND_404);
  });

  // -- UNAUTH -- //
  it('- DELETE item unauth', async () => {
    await request(app).delete(`${route}/-100`).expect(HTTP_STATUSES.UNAUTHORIZED_401);
    await request(app).get(route).expect(HTTP_STATUSES.OK_200, {
      items: [],
      page: 1,
      pagesCount: 0,
      pageSize: 10,
      totalCount: 0,
    });
  });
  it('- POST item unauth', async () => {
    const data: ICreatePost = {
      blogId: 'new title',
      content: 'new content',
      shortDescription: 'new shortDescription',
      title: 'new title',
    };

    await request(app).post(route).send(data).expect(HTTP_STATUSES.UNAUTHORIZED_401);
    await request(app).get(route).expect(HTTP_STATUSES.OK_200, {
      items: [],
      page: 1,
      pagesCount: 0,
      pageSize: 10,
      totalCount: 0,
    });
  });
  it('- PUT item unauth', async () => {
    const data: ICreatePost = {
      blogId: blog.id,
      content: 'new content1',
      shortDescription: 'new shortDescription1',
      title: 'new title1',
    };

    await request(app).put(`${route}/-100`).send(data).expect(HTTP_STATUSES.UNAUTHORIZED_401);
    await request(app).get(route).expect(HTTP_STATUSES.OK_200, {
      items: [],
      page: 1,
      pagesCount: 0,
      pageSize: 10,
      totalCount: 0,
    });
  });

  let newItem1: IPostOutput;
  let newItem2: IPostOutput;
  const data1: ICreatePost = {
    blogId: '',
    content: 'new content1',
    shortDescription: 'new shortDescription1',
    title: 'new title1',
  };
  const data2: ICreatePost = {
    blogId: '',
    content: 'new content2',
    shortDescription: 'new shortDescription2',
    title: 'new title2',
  };

  it('+ POST first item with correct input data', async () => {
    data1.blogId = blog.id;
    const res = await request(app)
      .post(route)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data1)
      .expect(HTTP_STATUSES.CREATED_201);

    newItem1 = res.body;

    expect(newItem1).toEqual({
      id: expect.any(String),
      blogId: blog.id,
      blogName: blog.name,
      content: data1.content,
      shortDescription: data1.shortDescription,
      title: data1.title,
      createdAt: expect.any(String),
    });
    await request(app)
      .get(route)
      .expect(HTTP_STATUSES.OK_200, {
        items: [newItem1],
        page: 1,
        pagesCount: 1,
        pageSize: 10,
        totalCount: 1,
      });
  });
  it('+ POST second item with correct input data', async () => {
    data2.blogId = blog.id;
    const res = await request(app)
      .post(route)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data2)
      .expect(HTTP_STATUSES.CREATED_201);

    newItem2 = res.body;

    expect(newItem2).toEqual({
      id: expect.any(String),
      blogId: blog.id,
      blogName: blog.name,
      content: data2.content,
      shortDescription: data2.shortDescription,
      title: data2.title,
      createdAt: expect.any(String),
    });
    await request(app)
      .get(route)
      .expect(HTTP_STATUSES.OK_200, {
        items: [newItem2, newItem1],
        page: 1,
        pagesCount: 1,
        pageSize: 10,
        totalCount: 2,
      });
  });

  // -- INCORRECT DATA -- //
  it('- POST item with incorrect data', async () => {
    const data1: ICreatePost = {
      blogId: '',
      content: 'new content2',
      shortDescription: 'new shortDescription2',
      title: 'new title2',
    };
    const data2: ICreatePost = {
      blogId: blog.id,
      content: '',
      shortDescription: 'new shortDescription2',
      title: 'new title2',
    };
    const data3: ICreatePost = {
      blogId: blog.id,
      content: 'new content2',
      shortDescription: '',
      title: 'new title2',
    };
    const data4: ICreatePost = {
      blogId: blog.id,
      content: 'new content2',
      shortDescription: 'new shortDescription2',
      title: '',
    };

    await request(app)
      .post(route)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data1)
      .expect(HTTP_STATUSES.BAD_REQUEST_400);
    await request(app)
      .post(route)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data2)
      .expect(HTTP_STATUSES.BAD_REQUEST_400);
    await request(app)
      .post(route)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data3)
      .expect(HTTP_STATUSES.BAD_REQUEST_400);
    await request(app)
      .post(route)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data4)
      .expect(HTTP_STATUSES.BAD_REQUEST_400);
    await request(app)
      .get(route)
      .expect(HTTP_STATUSES.OK_200, {
        items: [newItem2, newItem1],
        page: 1,
        pagesCount: 1,
        pageSize: 10,
        totalCount: 2,
      });
  });
  it('- PUT fisrt item with incorrect data', async () => {
    const data1: ICreatePost = {
      blogId: '',
      content: 'new content2',
      shortDescription: 'new shortDescription2',
      title: 'new title2',
    };
    const data2: ICreatePost = {
      blogId: blog.id,
      content: '',
      shortDescription: 'new shortDescription2',
      title: 'new title2',
    };
    const data3: ICreatePost = {
      blogId: blog.id,
      content: 'new content2',
      shortDescription: '',
      title: 'new title2',
    };
    const data4: ICreatePost = {
      blogId: blog.id,
      content: 'new content2',
      shortDescription: 'new shortDescription2',
      title: '',
    };

    await request(app)
      .put(`${route}/${newItem1.id}`)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data1)
      .expect(HTTP_STATUSES.BAD_REQUEST_400);
    await request(app)
      .put(`${route}/${newItem1.id}`)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data2)
      .expect(HTTP_STATUSES.BAD_REQUEST_400);
    await request(app)
      .put(`${route}/${newItem1.id}`)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data3)
      .expect(HTTP_STATUSES.BAD_REQUEST_400);
    await request(app)
      .put(`${route}/${newItem1.id}`)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data4)
      .expect(HTTP_STATUSES.BAD_REQUEST_400);

    await request(app)
      .get(route)
      .expect(HTTP_STATUSES.OK_200, {
        items: [newItem2, newItem1],
        page: 1,
        pagesCount: 1,
        pageSize: 10,
        totalCount: 2,
      });
  });

  it('+ GET fisrt item by id', async () => {
    await request(app).get(`${route}/${newItem1.id}`).expect(HTTP_STATUSES.OK_200, newItem1);
  });
  it('+ PUT fisrt item by id', async () => {
    const data: ICreatePost = {
      blogId: blog.id,
      content: 'new content2',
      shortDescription: 'new shortDescription2',
      title: 'new title2',
    };

    await request(app)
      .put(`${route}/${newItem1.id}`)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .send(data)
      .expect(HTTP_STATUSES.NO_CONTENT_204);

    const res = await request(app).get(`${route}/${newItem1.id}`);
    const updatedItem = res.body;
    expect(updatedItem).toEqual({
      ...newItem1,
      ...data,
    });

    await request(app)
      .get(route)
      .expect(HTTP_STATUSES.OK_200, {
        items: [
          newItem2,
          {
            ...newItem1,
            ...data,
          },
        ],
        page: 1,
        pagesCount: 1,
        pageSize: 10,
        totalCount: 2,
      });
  });

  it('+ DELETE fisrt item', async () => {
    await request(app)
      .delete(`${route}/${newItem1.id}`)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .expect(HTTP_STATUSES.NO_CONTENT_204);
    await request(app)
      .get(route)
      .expect(HTTP_STATUSES.OK_200, {
        items: [newItem2],
        page: 1,
        pagesCount: 1,
        pageSize: 10,
        totalCount: 1,
      });
  });
  it('+ DELETE second item', async () => {
    await request(app)
      .delete(`${route}/${newItem2.id}`)
      .set('authorization', 'Basic YWRtaW46cXdlcnR5')
      .expect(HTTP_STATUSES.NO_CONTENT_204);
    await request(app).get(route).expect(HTTP_STATUSES.OK_200, {
      items: [],
      page: 1,
      pagesCount: 0,
      pageSize: 10,
      totalCount: 0,
    });
  });
});
